export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export interface TimeEntry {
  id: string;
  project: string;
  startTime: string;
  endTime: string | null;
}

export interface Todo {
  id: string;
  text: string;
  details: string;
  status: 'in_progress' | 'waiting' | 'done';
  createdAt: string;
}

export async function loadTimeEntries(): Promise<TimeEntry[]> {
  const res = await fetch('/api/time-entries');
  return res.json();
}

export async function saveTimeEntries(entries: TimeEntry[]): Promise<void> {
  await fetch('/api/time-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
  });
}

export async function loadTodos(): Promise<Todo[]> {
  const res = await fetch('/api/todos');
  return res.json();
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todos),
  });
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export async function loadNotes(): Promise<Note[]> {
  const res = await fetch('/api/notes');
  return res.json();
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notes),
  });
}

export interface Link {
  id: string;
  title: string;
  url: string;
  tags: string[];
  type: 'web' | 'folder';
  clickCount: number;
  createdAt: string;
}

export async function loadLinks(): Promise<Link[]> {
  const res = await fetch('/api/links');
  return res.json();
}

export async function saveLinks(links: Link[]): Promise<void> {
  await fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(links),
  });
}

export interface ImportantDate {
  id: string;
  title: string;
  description: string;
  date: string;
  createdAt: string;
}

export async function loadDates(): Promise<ImportantDate[]> {
  const res = await fetch('/api/dates');
  return res.json();
}

export async function saveDates(dates: ImportantDate[]): Promise<void> {
  await fetch('/api/dates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dates),
  });
}
