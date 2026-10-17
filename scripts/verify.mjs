import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { seed } from './seed.mjs';
import { runSuite } from './run-suite.mjs';
import { openDatabase } from '../src/database.mjs';

mkdirSync('.runtime', { recursive: true }); mkdirSync('evidence/runs', { recursive: true });
const implementationFile = 'src/app.mjs';
const original = readFileSync(implementationFile, 'utf8');
const specHash = () => createHash('sha256').update(readFileSync('openapi/openapi.json')).digest('hex');
const initialHash = specHash();
let server;
async function start() {
  server = spawn(process.execPath, ['src/server.mjs'], { env: { ...process.env, PORT:'3107', HOST:'127.0.0.1', DB_PATH:'.runtime/verification.sqlite' }, stdio: ['ignore','pipe','pipe'], windowsHide:true });
  let log=''; server.stdout.on('data',d=>log+=d); server.stderr.on('data',d=>log+=d);
  for(let i=0;i<100;i++) { if(server.exitCode!==null) throw new Error(log); try { const r=await fetch('http://127.0.0.1:3107/health'); if(r.ok) return; } catch {} await new Promise(r=>setTimeout(r,100)); }
  throw new Error('El servidor no inició: '+log);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  await new Promise(resolve=>{server.once('exit',resolve); server.kill();});
  server=undefined;
}
async function run(label, expectedSuccess=true) {
  const env=seed('.runtime/verification.sqlite','.runtime/verification.local.json','http://127.0.0.1:3107');
  await start();
  try {
    const result=await runSuite({environment:env,output:`evidence/runs/${label}.json`,label});
    assert.equal(result.success,expectedSuccess,`Resultado inesperado en ${label}`);
    return result;
  } finally { await stop(); }
}
const manifest={startedAt:new Date().toISOString(),contractSHA256:initialHash,runs:[]};
writeFileSync('evidence/verification.json',JSON.stringify({...manifest,success:false,status:'running'},null,2)+'\n');
try {
  await import('./validate.mjs');
  const baseline=await run('baseline'); manifest.runs.push({label:'baseline',success:baseline.success});
  const broken=original.replace('totalCents: Number(row.total_cents)', 'totalCents: String(row.total_cents)');
  assert.notEqual(broken,original,'No se encontró el punto de inyección.');
  const lines=original.split('\n');
  const lineIndex=lines.findIndex(l=>l.includes('totalCents: Number(row.total_cents)'));
  const patchStart=lineIndex-3;
  const patch='--- a/src/app.mjs\n+++ b/src/app.mjs\n@@ -'+(patchStart+1)+',7 +'+(patchStart+1)+',7 @@\n'+lines.slice(patchStart,patchStart+7).flatMap((line,i)=>i===3?['-'+line,'+'+line.replace('Number(row.total_cents)','String(row.total_cents)')]:[' '+line]).join('\n')+'\n';
  mkdirSync('defects',{recursive:true}); writeFileSync('defects/total-as-string.patch',patch);
  // Mutación temporal y reversible de la implementación. Nunca se altera el contrato.
  writeFileSync(implementationFile,broken);
  let defective;
  try { defective=await run('controlled-defect',false); } finally { writeFileSync(implementationFile,original); }
  assert(defective.executions.some(e=>e.name.startsWith('TC-02')&&e.assertions.some(a=>a.name.includes('esquema Order')&&!a.passed)),'El defecto no produjo la falla de esquema esperada.');
  assert(defective.contractFailures.some(f=>f.message.includes('must be integer')),'El validador de contrato no detectó el defecto.');
  manifest.runs.push({label:'controlled-defect',success:false,expectedFailure:true});
  for(const label of ['corrected','clean-repeat']) { const result=await run(label); manifest.runs.push({label,success:result.success}); }
  // Persistencia real a través del cierre y reapertura de la aplicación y SQLite.
  const env=seed('.runtime/verification.sqlite','.runtime/verification.local.json','http://127.0.0.1:3107');
  const values=Object.fromEntries(env.values.map(v=>[v.key,v.value]));
  await start();
  const login=await (await fetch(values.baseUrl+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:values.emailA,password:values.passwordA})})).json();
  const response=await fetch(values.baseUrl+'/orders',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+login.accessToken},body:JSON.stringify({items:[{product:'Persistencia al reiniciar',quantity:1,unitPriceCents:100}],currency:'GTQ'})});
  assert.equal(response.status,201); const created=await response.json(); await stop(); await start();
  const recovered=await (await fetch(values.baseUrl+'/orders/'+created.id,{headers:{Authorization:'Bearer '+login.accessToken}})).json();
  assert.deepEqual(recovered,created); await stop();
  const db=openDatabase('.runtime/verification.sqlite'); assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1); db.close();
  writeFileSync('evidence/persistence-restart.json',JSON.stringify({checkedAt:new Date().toISOString(),success:true,created,recovered,description:'El servidor se detuvo y se inició con el mismo archivo SQLite; el recurso y la sesión persistieron.'},null,2)+'\n');
  seed('.runtime/verification.sqlite','.runtime/verification.local.json','http://127.0.0.1:3107');
  assert.equal(specHash(),initialHash,'El contrato cambió durante el defecto.');
  assert.equal(readFileSync(implementationFile,'utf8'),original,'La implementación no quedó corregida.');
  manifest.finishedAt=new Date().toISOString(); manifest.implementationRestored=true; manifest.contractUnchanged=true; manifest.success=true;
  writeFileSync('evidence/verification.json',JSON.stringify(manifest,null,2)+'\n');
  console.log('VALIDACIÓN COMPLETA: referencia, defecto detectado, corrección, repetición limpia y persistencia al reiniciar.');
} catch(error) {
  manifest.finishedAt=new Date().toISOString(); manifest.success=false; manifest.error=error.message;
  writeFileSync('evidence/verification.json',JSON.stringify(manifest,null,2)+'\n');
  throw error;
} finally { writeFileSync(implementationFile,original); await stop(); }
