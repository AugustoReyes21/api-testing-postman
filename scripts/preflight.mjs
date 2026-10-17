import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const files=execFileSync('git',['ls-files','--cached','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
assert(files.length>20,'Prepare el índice de Git antes de la revisión previa.');
const forbidden=files.filter(f=>/(^|\/)(node_modules|\.runtime|\.env)(\/|$)|\.sqlite(?:-|$)|\.local\.json$/.test(f));
assert.deepEqual(forbidden,[],'Hay archivos locales o sensibles en el índice.');
const values=[];
for(const f of readdirSync('.runtime').filter(n=>n.endsWith('.json'))) {
  try { const data=JSON.parse(readFileSync('.runtime/'+f)); for(const v of data.values || []) if(/password|token/i.test(v.key)&&v.value)values.push(String(v.value)); } catch {}
}
let scanned=0;
for(const file of files.filter(f=>/\.(mjs|json|md|txt|csv|yaml|yml|html|ps1|py|patch)$|(^|\/)\.gitignore$/.test(f))) {
  const data=readFileSync(file,'utf8'); scanned++;
  for(const secret of values) assert(!data.includes(secret),'Valor local de credencial encontrado en '+file);
  if(file!=='scripts/preflight.mjs') assert(!/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{25,}|sk-proj-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)/.test(data),'Posible secreto en '+file);
}
const readme=readFileSync('README.md','utf8');
const links=[...readme.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]).filter(p=>!/^https?:/.test(p));
for(const link of links) assert(existsSync(link),'Enlace relativo roto: '+link);
const final=JSON.parse(readFileSync('evidence/runs/clean-repeat.json'));
const verification=JSON.parse(readFileSync('evidence/verification.json'));
assert(final.success&&verification.success&&verification.implementationRestored&&verification.contractUnchanged);
assert(readFileSync('src/app.mjs','utf8').includes('totalCents: Number(row.total_cents)'));
assert(!readFileSync('src/app.mjs','utf8').includes('totalCents: String(row.total_cents)'));
execFileSync('git',['apply','--check','defects/total-as-string.patch']);
const report={checkedAt:new Date().toISOString(),stagedFiles:files.length,textFilesScanned:scanned,relativeLinksChecked:links.length,forbiddenFiles:forbidden,localCredentialsFound:false,knownSecretPatternsFound:false,defectInactive:true,demonstrationPatchApplicable:true,finalVerificationSuccess:true,note:'Búsqueda preventiva de patrones y valores locales, no una garantía de detección de todos los tipos de secretos. Las capturas se inspeccionaron visualmente.'};
writeFileSync('evidence/preflight.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
