import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
const read = name => JSON.parse(readFileSync(name));
const labels = ['baseline','controlled-defect','corrected','clean-repeat'];
const runs=labels.map(label=>read('evidence/runs/'+label+'.json'));
const final=runs.at(-1);
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const idem=final.executions.filter(e=>e.name.startsWith('TC-11'));
const row=values=>'<tr>'+values.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
const table=(head,rows)=>'<table><thead>'+row(head)+'</thead><tbody>'+rows.map(row).join('')+'</tbody></table>';
const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>Evidencia real de Newman</title><style>body{font:18px Arial,sans-serif;line-height:1.4;color:#111;background:white;max-width:1200px;margin:24px auto}h1,h2{font-size:23px}section{padding:14px 0;margin:20px 0}table{border-collapse:collapse;width:100%;font-size:17px}td,th{border:1px solid #999;padding:10px;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px}header p{margin:6px 0}</style><header><h1>Resultados auténticos de ejecución — Newman</h1><p>Informes JSON sanitizados de evidence/runs. Esta página no es una captura de Postman.</p><p>API Node.js/Express + SQLite; contrato OpenAPI 3.1; datos ficticios.</p></header><section id="runs"><h2>Ejecuciones y defecto controlado</h2>'+table(['Ejecución','Casos','Solicitudes','Aprobadas','Fallidas','Errores contrato'],runs.map(r=>[r.label,r.caseCount,r.requestCount,r.assertionsPassed,r.assertionsFailed,r.contractFailures.length]))+'<p>El defecto convirtió totalCents a texto; se restauró el tipo entero sin cambiar el contrato.</p></section><section id="idempotency"><h2>TC-11 — Estado real después de repetir PUT</h2><p>Fuente: '+esc(final.label)+'; '+esc(final.finishedAt)+' (UTC).</p>'+table(['Operación','HTTP','id','status','version','totalCents','updatedAt'],idem.map(e=>[e.method+' '+e.path,e.status,e.body.id,e.body.status,e.body.version,e.body.totalCents,e.body.updatedAt]))+'<p>La segunda aplicación y la consulta final conservan el mismo recurso completo, no solo el código HTTP.</p></section><section id="details"><h2>Solicitudes y aserciones</h2>'+final.executions.map(e=>'<h3>'+esc(e.name)+'</h3><p>'+esc(e.method+' '+e.path+' — HTTP '+e.status)+'</p><pre>'+esc(JSON.stringify(e.body,null,2))+'</pre><ul>'+e.assertions.map(a=>'<li>'+esc((a.passed?'PASS':'FAIL')+' | '+a.name)+'</li>').join('')+'</ul>').join('')+'</section></html>';
writeFileSync('evidence/execution-report.html',html);
const browserPath=process.env.BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if(!existsSync(browserPath)) throw new Error('Indique BROWSER_PATH para capturar el informe en un navegador Chromium instalado.');
const browser=await chromium.launch({executablePath:browserPath,headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});
 await page.setContent(html);
 await page.locator('#runs').screenshot({path:'evidence/screenshots/newman-runs.png'});
 await page.locator('#idempotency').screenshot({path:'evidence/screenshots/newman-idempotency-state.png'});
} finally { await browser.close(); }
const manifest={createdAt:new Date().toISOString(),description:'Capturas postman-*: ventana real de Postman 12.32.4 mediante CopyFromScreen, recortada antes de guardar. Capturas newman-*: navegador Chromium mostrando los datos reales del reporte Newman; no son interfaz Postman.',files:readdirSync('evidence/screenshots').filter(n=>n.endsWith('.png')).map(name=>({path:'evidence/screenshots/'+name,sha256:createHash('sha256').update(readFileSync('evidence/screenshots/'+name)).digest('hex')}))};
writeFileSync('evidence/screenshot-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Informe HTML y capturas reales del informe generados; manifiesto SHA-256 actualizado.');
