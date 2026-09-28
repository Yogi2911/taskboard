const path = require('path');
const express = require('express');
const cors = require('cors');
const { tasksRouter } = require('./routes');

function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/tasks', tasksRouter(db));
  app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

  app.use(express.static(path.join(__dirname, 'public')));

  // JSON body parse errors and anything unexpected
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  });

  return app;
}

module.exports = { createApp };
