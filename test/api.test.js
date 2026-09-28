const test = require('node:test');
const assert = require('node:assert');
const { openDb } = require('../db');
const { createApp } = require('../app');

let server, base;

test.before(async () => {
  const app = createApp(openDb(':memory:'));
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://localhost:${server.address().port}/api`;
});
test.after(() => server.close());

const json = (method, url, body) =>
  fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

test('create, read, update, delete a task', async () => {
  let res = await json('POST', '/tasks', { title: 'Write tests', priority: 'high' });
  assert.equal(res.status, 201);
  const task = await res.json();
  assert.equal(task.status, 'todo');
  assert.equal(task.priority, 'high');

  res = await json('PATCH', `/tasks/${task.id}`, { status: 'doing', due_date: '2026-10-01' });
  const updated = await res.json();
  assert.equal(updated.status, 'doing');
  assert.equal(updated.due_date, '2026-10-01');
  assert.equal(updated.title, 'Write tests');

  res = await json('GET', '/tasks?status=doing');
  assert.equal((await res.json()).length, 1);

  res = await json('DELETE', `/tasks/${task.id}`);
  assert.equal(res.status, 204);
  res = await json('GET', `/tasks/${task.id}`);
  assert.equal(res.status, 404);
});

test('validation rejects bad input', async () => {
  assert.equal((await json('POST', '/tasks', { title: '  ' })).status, 400);
  assert.equal((await json('POST', '/tasks', { title: 'x', status: 'nope' })).status, 400);
  assert.equal((await json('POST', '/tasks', { title: 'x', due_date: 'tomorrow' })).status, 400);
  assert.equal((await json('PATCH', '/tasks/999', { title: 'x' })).status, 404);
});

test('search filters by title and notes', async () => {
  await json('POST', '/tasks', { title: 'Buy milk', notes: 'from the corner shop' });
  await json('POST', '/tasks', { title: 'Book flights' });
  const res = await json('GET', '/tasks?q=shop');
  const list = await res.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].title, 'Buy milk');
});
