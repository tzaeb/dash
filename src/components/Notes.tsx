import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type Note, loadNotes, saveNotes } from '../api';
import './Notes.css';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function AutoResizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  useEffect(() => resize(), [props.value]);

  return (
    <textarea
      {...props}
      ref={ref}
      onInput={(e) => {
        resize();
        props.onInput?.(e);
      }}
    />
  );
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotes().then(setNotes);
  }, []);

  const persist = useCallback((updated: Note[]) => {
    setNotes(updated);
    saveNotes(updated);
  }, []);

  function addNote() {
    const note: Note = {
      id: generateId(),
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [note, ...notes];
    persist(updated);
    setEditingId(note.id);
  }

  function updateNote(id: string, changes: Partial<Pick<Note, 'title' | 'content'>>) {
    persist(
      notes.map((n) =>
        n.id === id ? { ...n, ...changes, updatedAt: new Date().toISOString() } : n
      )
    );
  }

  function deleteNote(id: string) {
    if (editingId === id) setEditingId(null);
    persist(notes.filter((n) => n.id !== id));
  }

  const filtered = searchQuery.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notes;

  return (
    <div className="notes">
      <div className="notes-toolbar">
        <input
          className="notes-search"
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="btn btn-start" onClick={addNote}>
          New Note
        </button>
      </div>

      <div className="notes-grid">
        <AnimatePresence mode="popLayout">
          {filtered.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={'note-card' + (isEditing ? ' note-card-editing' : '')}
              >
                {isEditing ? (
                  <>
                    <input
                      className="note-title-input"
                      type="text"
                      placeholder="Note title..."
                      value={note.title}
                      onChange={(e) => updateNote(note.id, { title: e.target.value })}
                      autoFocus
                    />
                    <AutoResizeTextarea
                      className="note-content-input"
                      placeholder="Write your note (supports markdown)..."
                      value={note.content}
                      onChange={(e) => updateNote(note.id, { content: e.target.value })}
                    />
                    <div className="note-actions">
                      <button
                        className="note-action-btn"
                        onClick={() => setEditingId(null)}
                      >
                        Done
                      </button>
                      <button
                        className="note-action-btn note-action-del"
                        onClick={() => deleteNote(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="note-preview" onClick={() => setEditingId(note.id)}>
                    <div className="note-preview-title">
                      {note.title || 'Untitled'}
                    </div>
                    {note.content ? (
                      <div className="note-preview-content">
                        <Markdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {note.content}
                        </Markdown>
                      </div>
                    ) : (
                      <span className="note-preview-empty">Empty note</span>
                    )}
                    <span className="note-preview-date">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
