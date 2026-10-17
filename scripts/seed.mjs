import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { openDatabase } from '../src/database.mjs';
import { newSecret, passwordHash } from '../src/security.mjs';

// Invocar con el servidor detenido. Solo elimina datos de la base explícita de esta práctica.
export function seed(file = '.runtime/orders.sqlite', environmentFile = '.runtime/postman.local.json', baseUrl = 'http://127.0.0.1:3000') {
  const db = openDatabase(file);
  const passwordA = newSecret(), passwordB = newSecret();
  db.exec('BEGIN; DELETE FROM sessions; DELETE FROM orders; DELETE FROM users; DELETE FROM sqlite_sequence WHERE name=\'orders\';');
  const users = [{ id: 1, email: 'ana@example.test', password: passwordA }, { id: 2, email: 'bruno@example.test', password: passwordB }];
  for (const user of users) {
    const salt = newSecret();
    db.prepare('INSERT INTO users(id,email,salt,password_hash) VALUES(?,?,?,?)').run(user.id, user.email, salt, passwordHash(user.password, salt));
  }
  db.exec('COMMIT'); db.close();
  const values = { baseUrl, emailA: users[0].email, emailB: users[1].email, passwordA, passwordB };
  const environment = { id: 'a4b8c8c3-33a3-4a9a-9e81-922529f7e007', name: 'Pedidos LOCAL (credenciales ficticias)', values: Object.entries(values).map(([key, value]) => ({ key, value, type: key.startsWith('password') ? 'secret' : 'default', enabled: true })), _postman_variable_scope: 'environment' };
  mkdirSync('.runtime', { recursive: true });
  writeFileSync(environmentFile, JSON.stringify(environment, null, 2) + '\n', { mode: 0o600 });
  console.log('Datos restablecidos: dos usuarios ficticios, cero pedidos. Credenciales solo en el ambiente local ignorado por Git.');
  return environment;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) seed();
