import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { type Note, generateId, loadNotes, saveNotes } from '../api';
import './Notes.css';

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
  const [editSnapshot, setEditSnapshot] = useState<Note | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes().then(setNotes);
  }, []);

  useEffect(() => {
    const handleNew = () => addNote();
    const handleEscape = () => {
      if (editingId) cancelEdit();
      else if (expandedId) setExpandedId(null);
    };
    window.addEventListener('dash:new-item', handleNew);
    window.addEventListener('dash:escape', handleEscape);
    return () => {
      window.removeEventListener('dash:new-item', handleNew);
      window.removeEventListener('dash:escape', handleEscape);
    };
  });

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
    setExpandedId(note.id);
    setEditSnapshot(note);
    setEditingId(note.id);
  }

  function startEditing(note: Note) {
    setEditSnapshot({ ...note });
    setEditingId(note.id);
  }

  function cancelEdit() {
    if (editSnapshot) {
      persist(
        notes.map((n) => (n.id === editSnapshot.id ? editSnapshot : n))
      );
    }
    setEditingId(null);
    setEditSnapshot(null);
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
    if (expandedId === id) setExpandedId(null);
    persist(notes.filter((n) => n.id !== id));
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const reordered = [...notes];
    const fromIdx = reordered.findIndex((n) => n.id === dragId);
    const toIdx = reordered.findIndex((n) => n.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    persist(reordered);
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
          {filtered.map((note) => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={
                'note-card' +
                (dragId === note.id ? ' note-card-dragging' : '') +
                (dragOverId === note.id ? ' note-card-dragover' : '')
              }
              draggable={!searchQuery.trim()}
              onDragStart={() => setDragId(note.id)}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(note.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => { e.preventDefault(); handleDrop(note.id); setDragId(null); setDragOverId(null); }}
              onClick={() => { if (!dragId) setExpandedId(note.id); }}
            >
              <div className="note-preview">
                <div className="note-preview-title">
                  {note.title || 'Untitled'}
                </div>
                {note.content ? (
                  <div className="note-preview-content">
                    <Markdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {expandedId && (() => {
          const note = notes.find((n) => n.id === expandedId);
          if (!note) return null;
          const isEditing = editingId === expandedId;
          return (
            <motion.div
              key="overlay"
              className="note-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => { if (editingId) cancelEdit(); setExpandedId(null); }}
            >
              <motion.div
                className="note-expanded"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="note-expanded-header">
                  {isEditing ? (
                    <input
                      className="note-title-input"
                      type="text"
                      placeholder="Note title..."
                      value={note.title}
                      onChange={(e) => updateNote(note.id, { title: e.target.value })}
                      autoFocus
                    />
                  ) : (
                    <div className="note-expanded-title">{note.title || 'Untitled'}</div>
                  )}
                  <span className="note-expanded-date">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="note-expanded-body">
                  {isEditing ? (
                    <AutoResizeTextarea
                      className="note-content-input note-expanded-textarea"
                      placeholder="Write your note (supports markdown)..."
                      value={note.content}
                      onChange={(e) => updateNote(note.id, { content: e.target.value })}
                    />
                  ) : (
                    <div className="note-expanded-preview">
                      {note.content ? (
                        <Markdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
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
                      ) : (
                        <span className="note-preview-empty">Empty note</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="note-expanded-actions">
                  <div className="note-expanded-actions-left">
                    {isEditing ? (
                      <>
                        <button
                          className="note-action-btn"
                          onClick={() => { setEditingId(null); setEditSnapshot(null); setExpandedId(null); }}
                        >
                          Done
                        </button>
                        <button
                          className="note-action-btn"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="note-action-btn"
                          onClick={() => { setExpandedId(null); }}
                        >
                          Close
                        </button>
                        <button className="note-action-btn" onClick={() => startEditing(note)}>
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    className="note-action-btn note-action-del"
                    onClick={() => deleteNote(note.id)}
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
