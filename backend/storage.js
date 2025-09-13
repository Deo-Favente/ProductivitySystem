/*
  Nom : storage.js
  Description : Gestion de la base de données (fichier JSON)
  Auteur : Deo-Favente
*/

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.join(__dirname, "data", "tickets.json"); // Chemin absolu

// petite file pour sérialiser les écritures
let chain = Promise.resolve();

async function ensureDB() {
  // Préparer la db
  try {
    // Ouvrir le fichier s'il existe
    await fs.access(DB_PATH);
  } catch {
    // Sinon, créer le dossier et le fichier initial
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
  // Lire et parser la db
  await ensureDB();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeDB(db) {
  // Sérialiser et écrire la db
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function withDB(fn) {
  // Sérialiser les accès en file d'attente
  // La fonction fn(db) est appelée avec la db lue, et peut retourner { value, persist (optionnel) }
  // Si persist !== false, la db est réécrite après l'appel
  // La fonction withDB() renvoie une promesse de la valeur retournée par fn()

  chain = chain.then(async () => {
    const db = await readDB();
    const result = await fn(db);
    if (result?.persist !== false) await writeDB(db);
    return result?.value;
  }).catch(err => {
    console.error("[withDB] error:", err);
    return undefined; // Ne pas propager l'erreur dans la chaîne
  });
  return chain;
}
