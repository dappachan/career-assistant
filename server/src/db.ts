import Database from "better-sqlite3";

const db = new Database(process.env.VITEST ? ":memory:" : "reviews.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resume_text TEXT NOT NULL,
    feedback TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

export default db;