import Database from 'better-sqlite3';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const dbPath = process.env.NODE_ENV === 'test' 
      ? ':memory:' 
      : path.resolve(process.cwd(), 'relay.db');
      
    dbInstance = new Database(dbPath, { fileMustExist: false });
    dbInstance.pragma('journal_mode = WAL');
    initDb(dbInstance);
  }
  return dbInstance;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      nodes TEXT NOT NULL,
      edges TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      workflowId TEXT NOT NULL,
      status TEXT NOT NULL,
      currentNodeId TEXT,
      context TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      completedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS node_executions (
      id TEXT PRIMARY KEY,
      executionId TEXT NOT NULL,
      nodeId TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT,
      error TEXT,
      durationMs INTEGER,
      startedAt INTEGER NOT NULL,
      completedAt INTEGER,
      retried INTEGER DEFAULT 0
    );
  `);
}
