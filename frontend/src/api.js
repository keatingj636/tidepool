// API 基础地址 — 测试时换成你电脑的局域网 IP
// 例如: http://192.168.1.100:8000
const BASE_URL = 'http://192.168.1.43:8000'; // 局域网 IP，手机和电脑需在同一网络

function toDateStr(date) {
  // 使用本地时间，避免 UTC 偏移导致日期错误
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── 任务池 ─────────────────────────────────────────────────────────────────

export async function fetchPool() {
  const res = await fetch(`${BASE_URL}/tasks/pool`);
  if (!res.ok) throw new Error('fetchPool failed');
  return res.json();
}

export async function createTask(title) {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('createTask failed');
  return res.json();
}

export async function updateTaskStatus(taskId, status) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('updateTaskStatus failed');
  return res.json();
}

// ── 日计划 ─────────────────────────────────────────────────────────────────

export async function fetchPlan(date = new Date()) {
  const res = await fetch(`${BASE_URL}/plan/${toDateStr(date)}`);
  if (!res.ok) throw new Error('fetchPlan failed');
  return res.json();
}

export async function addToPlan(date, taskId) {
  const dateStr = toDateStr(date);
  const res = await fetch(`${BASE_URL}/plan/${dateStr}/${taskId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position: 0 }),
  });
  if (!res.ok) throw new Error('addToPlan failed');
  return res.json();
}

export async function removeFromPlan(date, taskId) {
  const dateStr = toDateStr(date);
  const res = await fetch(`${BASE_URL}/plan/${dateStr}/${taskId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('removeFromPlan failed');
}

export async function closeDay(date = new Date()) {
  const res = await fetch(`${BASE_URL}/plan/${toDateStr(date)}/close`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('closeDay failed');
  return res.json();
}
