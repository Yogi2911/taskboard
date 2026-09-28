const express = require('express');

const STATUSES = ['todo', 'doing', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

// Validates a (partial) task body. Returns { error } or { value }.
function validate(body, { partial }) {
  const out = {};
  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim()) return { error: 'title is required' };
    if (body.title.length > 200) return { error: 'title must be 200 characters or fewer' };
    out.title = body.title.trim();
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') return { error: 'notes must be a string' };
    if (body.notes.length > 2000) return { error: 'notes must be 2000 characters or fewer' };
    out.notes = body.notes;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: `status must be one of: ${STATUSES.join(', ')}` };
    out.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) return { error: `priority must be one of: ${PRIORITIES.join(', ')}` };
    out.priority = body.priority;
  }
  if (body.due_date !== undefined) {
    if (body.due_date !== null && body.due_date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) {
      return { error: 'due_date must be YYYY-MM-DD' };
    }
    out.due_date = body.due_date || null;
  }
  return { value: out };
}

function tasksRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { status, q } = req.query;
    const where = [];
    const params = [];
    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status filter' });
      where.push('status = ?');
      params.push(status);
    }
    if (q) {
      where.push('(title LIKE ? OR notes LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const sql = `SELECT * FROM tasks ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id DESC`;
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/:id', (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    res.json(task);
  });

  router.post('/', (req, res) => {
    const { error, value } = validate(req.body || {}, { partial: false });
    if (error) return res.status(400).json({ error });
    const info = db
      .prepare(`INSERT INTO tasks (title, notes, status, priority, due_date)
                VALUES (@title, @notes, @status, @priority, @due_date)`)
      .run({ notes: '', status: 'todo', priority: 'medium', due_date: null, ...value });
    res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid));
  });

  router.patch('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'task not found' });
    const { error, value } = validate(req.body || {}, { partial: true });
    if (error) return res.status(400).json({ error });
    const m = { ...existing, ...value };
    db.prepare(`UPDATE tasks SET title=@title, notes=@notes, status=@status, priority=@priority,
                due_date=@due_date, updated_at=datetime('now') WHERE id=@id`).run({
      id: m.id, title: m.title, notes: m.notes, status: m.status, priority: m.priority, due_date: m.due_date,
    });
    res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(existing.id));
  });

  router.delete('/:id', (req, res) => {
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'task not found' });
    res.status(204).end();
  });

  return router;
}

module.exports = { tasksRouter };
