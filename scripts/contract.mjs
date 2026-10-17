import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
const spec = JSON.parse(readFileSync(new URL('../openapi/openapi.json', import.meta.url)));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const cache = new Map();
function resolve(schema) {
  if (schema?.$ref) return spec.components.schemas[schema.$ref.split('/').at(-1)];
  return schema;
}
function validate(schema, value) {
  schema = resolve(schema);
  const key = JSON.stringify(schema);
  if (!cache.has(key)) cache.set(key, ajv.compile(schema));
  const check = cache.get(key);
  return check(value) ? [] : check.errors.map(e => `${e.instancePath || '/'}: ${e.message}`);
}
export function checkExchange(request, response) {
  const url = new URL(request.url.toString());
  const method = request.method.toLowerCase();
  const template = Object.keys(spec.paths).find(p => new RegExp('^' + p.replace(/\{[^}]+\}/g, '[^/]+') + '$').test(url.pathname));
  const operation = spec.paths[template]?.[method];
  const errors = [];
  if (!operation) return [`Operación no documentada: ${method} ${url.pathname}`];
  const declared = operation.responses[String(response.code)];
  if (!declared) return [`HTTP ${response.code} no documentado para ${method} ${template}`];
  for (const [name, header] of Object.entries(declared.headers || {})) {
    const value = response.headers.get(name);
    if (value === undefined) errors.push(`Falta encabezado ${name}`);
    else errors.push(...validate(header.schema, value).map(e => `Encabezado ${name}: ${e}`));
  }
  if (response.code === 204) {
    if (response.text() !== '') errors.push('204 contiene cuerpo.');
  } else {
    if (!response.headers.get('Content-Type')?.includes('application/json')) errors.push('Content-Type de respuesta no es JSON.');
    try { errors.push(...validate(declared.content['application/json'].schema, response.json())); }
    catch { errors.push('Respuesta no es JSON válido.'); }
  }
  // Las solicitudes negativas están diseñadas para violar las entradas. Solo las exitosas deben satisfacerlas.
  if (response.code < 400) {
    for (const parameter of [...(spec.paths[template].parameters || []), ...(operation.parameters || [])]) {
      let value;
      if (parameter.in === 'query') value = url.searchParams.get(parameter.name);
      else if (parameter.in === 'path') {
        const names = [...template.matchAll(/\{([^}]+)\}/g)].map(x => x[1]);
        const values = new RegExp('^' + template.replace(/\{[^}]+\}/g, '([^/]+)') + '$').exec(url.pathname).slice(1);
        value = values[names.indexOf(parameter.name)];
      }
      if (value === null || value === undefined) { if (parameter.required) errors.push(`Falta ${parameter.name}`); continue; }
      if (parameter.schema.type === 'integer') value = Number(value);
      errors.push(...validate(parameter.schema, value).map(e => `Parámetro ${parameter.name}: ${e}`));
    }
    if (operation.requestBody) {
      if (!request.headers.get('Content-Type')?.includes('application/json')) errors.push('Content-Type de solicitud inválido.');
      try { errors.push(...validate(operation.requestBody.content['application/json'].schema, JSON.parse(request.body.raw))); }
      catch { errors.push('Solicitud exitosa sin cuerpo JSON válido.'); }
    }
    const security = operation.security ?? spec.security;
    if (security.length && !/^Bearer [A-Za-z0-9_-]+$/.test(request.headers.get('Authorization') || '')) errors.push('Operación protegida exitosa sin Bearer.');
  }
  return errors;
}
