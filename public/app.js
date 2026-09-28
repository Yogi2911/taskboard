const API = '/api/tasks';
const STATUSES = ['todo', 'doing', 'done'];
const LABELS = { todo: 'To do', doing: 'In progress', done: 'Done' };

let tasks = [];
let editingId = null;

const $ = (sel, root = document) => root.querySelector(sel);
const errorEl = $('#error');

function showError(msg) {
  errorEl.textContent = msg || '';
  errorEl.hidden = !msg;
}

async function api(path = '', options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function load() {
  try {
    const q = $('#search').value.trim();
    tasks = await api(q ? `?q=${encodeURIComponent(q)}` : '');
    showError('');
    render();
  } catch (e) {
    showError(`Could not load tasks. ${e.message}`);
  }
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function isOverdue(t) {
  return t.due_date && t.status !== 'done' && t.due_date < new Date().toISOString().slice(0, 10);
}

function card(t) {
  const idx = STATUSES.indexOf(t.status);
  const li = el('li', { className: `card ${t.status}`, draggable: true, tabIndex: 0 });
  li.dataset.id = t.id;
  li.dataset.priority = t.priority;

  li.append(el('div', { className: 'title', textContent: t.title }));
  if (t.notes) li.append(el('div', { className: 'notes', textContent: t.notes }));

  const due = t.due_date
    ? el('span', { className: isOverdue(t) ? 'overdue' : '', textContent: `${isOverdue(t) ? 'Overdue: ' : 'Due '}${t.due_date}` })
    : el('span', { textContent: `${t.priority} priority` });

  const move = el('div', { className: 'move' });
  if (idx > 0) move.append(el('button', { textContent: 'Back', title: `Move to ${LABELS[STATUSES[idx - 1]]}`, onclick: (e) => { e.stopPropagation(); setStatus(t.id, STATUSES[idx - 1]); } }));
  if (idx < 2) move.append(el('button', { textContent: 'Next', title: `Move to ${LABELS[STATUSES[idx + 1]]}`, onclick: (e) => { e.stopPropagation(); setStatus(t.id, STATUSES[idx + 1]); } }));

  li.append(el('div', { className: 'meta' }, due, move));

  li.addEventListener('click', () => openEdit(t.id));
  li.addEventListener('keydown', (e) => { if (e.key === 'Enter') openEdit(t.id); });
  li.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', t.id); li.classList.add('dragging'); });
  li.addEventListener('dragend', () => li.classList.remove('dragging'));
  return li;
}

function render() {
  for (const status of STATUSES) {
    const col = $(`.col[data-status="${status}"]`);
    const items = tasks.filter((t) => t.status === status);
    $('.count', col).textContent = items.length;
    const list = $('.list', col);
    list.replaceChildren(...(items.length ? items.map(card) : [el('li', { className: 'empty', textContent: status === 'todo' ? 'Nothing waiting. Add a task above.' : 'Drag a task here.' })]));
  }
}

async function setStatus(id, status) {
  try {
    await api(`/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await load();
  } catch (e) { showError(e.message); }
}

// Drag and drop between columns
document.querySelectorAll('.col').forEach((col) => {
  col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
  col.addEventListener('dragleave', () => col.classList.remove('over'));
  col.addEventListener('drop', (e) => {
    e.preventDefault();
    col.classList.remove('over');
    const id = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => String(t.id) === id);
    if (task && task.status !== col.dataset.status) setStatus(task.id, col.dataset.status);
  });
});

// Add
$('#add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#add-title').value,
        priority: $('#add-priority').value,
        due_date: $('#add-due').value || null,
      }),
    });
    e.target.reset();
    await load();
  } catch (err) { showError(err.message); }
});

// Edit dialog
const dialog = $('#edit-dialog');
function openEdit(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  editingId = id;
  $('#edit-title').value = t.title;
  $('#edit-notes').value = t.notes;
  $('#edit-priority').value = t.priority;
  $('#edit-due').value = t.due_date || '';
  dialog.showModal();
}
$('#edit-cancel').addEventListener('click', () => dialog.close());
$('#edit-form').addEventListener('submit', async () => {
  try {
    await api(`/${editingId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: $('#edit-title').value,
        notes: $('#edit-notes').value,
        priority: $('#edit-priority').value,
        due_date: $('#edit-due').value || null,
      }),
    });
    await load();
  } catch (err) { showError(err.message); }
});
$('#edit-delete').addEventListener('click', async () => {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    await api(`/${editingId}`, { method: 'DELETE' });
    dialog.close();
    await load();
  } catch (err) { showError(err.message); }
});

// Search (debounced)
let timer;
$('#search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 200); });

load();
