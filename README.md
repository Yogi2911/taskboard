# Taskboard

A small full-stack kanban board.

- **Frontend:** plain HTML, CSS and JavaScript (no build step), served by Express
- **Backend:** Node.js + Express REST API
- **Database:** SQLite via Node's built-in `node:sqlite` (no native modules; file created automatically). Requires Node 22.13 or newer

## Run it

```bash
npm install
cp .env.example .env   # optional
npm start
```

Open http://localhost:3000.

For auto-reload while developing: `npm run dev`. Run the API tests with `npm test`.

## With Docker

```bash
docker build -t taskboard .
docker run -p 3000:3000 -v taskboard-data:/data taskboard
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/tasks?status=todo&q=text` | List tasks (both filters optional) |
| GET | `/api/tasks/:id` | Get one task |
| POST | `/api/tasks` | Create. Body: `title` (required), `notes`, `status`, `priority`, `due_date` (YYYY-MM-DD) |
| PATCH | `/api/tasks/:id` | Update any subset of the fields above |
| DELETE | `/api/tasks/:id` | Delete a task |

`status` is `todo`, `doing` or `done`. `priority` is `low`, `medium` or `high`.

## Layout

```
server.js        entry point (loads env, opens DB, starts server)
app.js           Express app factory (used by server and tests)
routes.js        /api/tasks routes and validation
db.js            SQLite connection and schema
public/          frontend (index.html, styles.css, app.js)
test/            API tests (node:test)
```

## Ideas for next steps

Add user accounts and per-user boards, reorder tasks within a column, and swap SQLite for Postgres if you need multiple servers.
