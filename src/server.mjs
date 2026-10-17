import { openDatabase } from './database.mjs';
import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const db = openDatabase();
const server = createApp(db).listen(port, host, () => console.log(`API de pedidos disponible en http://${host}:${port}; SQLite listo.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
