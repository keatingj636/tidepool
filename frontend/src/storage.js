// Local SQLite storage — drop-in replacement for api.js
// Keeps the same function signatures so App.js needs minimal changes.
import * as SQLite from 'expo-sqlite';

let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('adhd.db').then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS tasks (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          title   TEXT    NOT NULL,
          status  TEXT    NOT NULL DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS day_plan_entries (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id  INTEGER NOT NULL,
          date     TEXT    NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (task_id) REFERENCES tasks(id)
        );
      `);
      return database;
    });
  }
  return dbPromise;
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Pool: pending tasks not assigned to any date
export async function fetchPool() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM tasks
     WHERE status = 'pending'
       AND id NOT IN (SELECT task_id FROM day_plan_entries)`
  );
}

export async function fetchPlan(date = new Date()) {
  const db = await getDb();
  const dateStr = toDateStr(date);
  const rows = await db.getAllAsync(
    `SELECT e.id, e.task_id, e.date, e.position,
            t.id AS t_id, t.title AS t_title, t.status AS t_status
     FROM day_plan_entries e
     JOIN tasks t ON e.task_id = t.id
     WHERE e.date = ?
     ORDER BY e.position`,
    [dateStr]
  );
  return rows.map(r => ({
    id:       r.id,
    task_id:  r.task_id,
    date:     r.date,
    position: r.position,
    task: { id: r.t_id, title: r.t_title, status: r.t_status },
  }));
}

export async function createTask(title) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO tasks (title, status) VALUES (?, 'pending')`,
    [title]
  );
  return { id: result.lastInsertRowId, title, status: 'pending' };
}

export async function updateTaskStatus(taskId, status) {
  const db = await getDb();
  await db.runAsync(`UPDATE tasks SET status = ? WHERE id = ?`, [status, taskId]);
  return db.getFirstAsync(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
}

export async function addToPlan(date, taskId) {
  const db = await getDb();
  const dateStr = toDateStr(date);
  const maxRow = await db.getFirstAsync(
    `SELECT MAX(position) AS maxPos FROM day_plan_entries WHERE date = ?`,
    [dateStr]
  );
  const position = (maxRow?.maxPos ?? -1) + 1;
  const result = await db.runAsync(
    `INSERT INTO day_plan_entries (task_id, date, position) VALUES (?, ?, ?)`,
    [taskId, dateStr, position]
  );
  const task = await db.getFirstAsync(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
  return { id: result.lastInsertRowId, task_id: taskId, date: dateStr, position, task };
}

export async function removeFromPlan(date, taskId) {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM day_plan_entries WHERE task_id = ? AND date = ?`,
    [taskId, toDateStr(date)]
  );
}

export async function closeDay(date = new Date()) {
  const db = await getDb();
  const dateStr = toDateStr(date);
  const result = await db.runAsync(
    `DELETE FROM day_plan_entries
     WHERE date = ?
       AND task_id IN (SELECT id FROM tasks WHERE status != 'done')`,
    [dateStr]
  );
  return { returned_to_pool: result.changes };
}
