import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ✅ Chemin absolu vers backend/data/tickets.json (indépendant du cwd)
export const DB_PATH = path.join(__dirname, "data", "tickets.json");

// petite file pour sérialiser les écritures
let chain = Promise.resolve();

async function ensureDB() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const initial = {
      todo: [], doing: [], done: [],
      meta: { nextId: 1, lastStartedId: null },
      metrics: { amounts: [] }
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDB() {
  await ensureDB();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeDB(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function withDB(fn) {
  chain = chain.then(async () => {
    const db = await readDB();
    const result = await fn(db);
    if (result?.persist !== false) await writeDB(db);
    return result?.value;
  });
  return chain;
}
