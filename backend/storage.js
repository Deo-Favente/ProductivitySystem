import { promises as fs } from "fs";
import path from "path";
const DB_PATH = path.resolve("data/tickets.json");

// petite file-queue pour éviter les écritures concurrentes
let chain = Promise.resolve();

async function readDB() {
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
    if (result?.persist !== false) {
      await writeDB(db);
    }
    return result?.value;
  });
  return chain;
}
