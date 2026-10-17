import newman from 'newman';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { checkExchange } from './contract.mjs';

export function runSuite({ environment = '.runtime/postman.local.json', output = 'evidence/runs/manual.json', collection = 'collections/pedidos.postman_collection.json', label = 'manual' } = {}) {
  const env = typeof environment === 'string' ? JSON.parse(readFileSync(environment)) : environment;
  const data = JSON.parse(readFileSync(collection));
  const exchanges = [];
  const startedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    newman.run({ collection: data, environment: env, reporters: ['cli'], reporter: { cli: { noSuccessAssertions: true } }, timeoutRequest: 5000, delayRequest: 10, color: 'off' }, (error, summary) => {
      if (error) return reject(error);
      const executions = summary.run.executions.map((e, i) => ({
        name: e.item.name, method: e.request.method,
        path: new URL(e.request.url.toString()).pathname + new URL(e.request.url.toString()).search,
        status: e.response?.code ?? null,
        body: sanitize(e.response?.json?.bind(e.response), e.response?.text?.bind(e.response)),
        assertions: (e.assertions || []).map(a => ({ name: a.assertion, passed: !a.error, ...(a.error ? { error: a.error.message } : {}) })),
        contractErrors: exchanges[i]?.errors || [],
      }));
      const cases = [...new Set(executions.map(e => e.name.match(/^TC-\d+/)?.[0]).filter(Boolean))].sort();
      const contractFailures = exchanges.flatMap(e => e.errors.map(message => ({ name: e.name, message })));
      const result = {
        label, startedAt, finishedAt: new Date().toISOString(), runner: 'Newman', newmanVersion: '6.2.3',
        cases, caseCount: cases.length, requestCount: summary.run.stats.requests.total,
        assertionCount: summary.run.stats.assertions.total, assertionsFailed: summary.run.stats.assertions.failed,
        assertionsPassed: summary.run.stats.assertions.total - summary.run.stats.assertions.failed,
        runtimeFailures: summary.run.failures.map(f => ({ source: f.source?.name || '', test: f.error?.test || '', message: f.error?.message || '' })),
        contractCheckCount: exchanges.length, contractFailures,
        success: summary.run.failures.length === 0 && contractFailures.length === 0 && cases.length === 18 && exchanges.length === executions.length,
        executions,
      };
      mkdirSync('evidence/runs', { recursive: true });
      writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
      console.log(`RESULTADO ${label}: ${result.caseCount} casos; ${result.requestCount} solicitudes; ${result.assertionsPassed}/${result.assertionCount} aserciones; ${result.assertionsFailed} fallidas; ${contractFailures.length} incompatibilidades de contrato.`);
      resolve(result);
    }).on('request', (error, args) => {
      exchanges.push({ name: args.item.name, errors: error ? [error.message] : checkExchange(args.request, args.response) });
    });
  });
}
function sanitize(json, text) {
  try { const body = json(); if (body?.accessToken) body.accessToken = '[REDACTED]'; return body; }
  catch { return text?.() || ''; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runSuite();
  if (!result.success) process.exitCode = 1;
}
