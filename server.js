require('dotenv').config();
const { openDb } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const db = openDb(process.env.DB_PATH || './data/taskboard.db');

createApp(db).listen(PORT, () => {
  console.log(`Taskboard running at http://localhost:${PORT}`);
});
