import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type Todo, generateId, loadTodos, saveTodos } from '../api';
import './TodoList.css';

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

const columns: { key: Todo['status']; label: string }[] = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'done', label: 'Done' },
];

const statusColors: Record<Todo['status'], string> = {
  in_progress: '#3b82f6',
  waiting: '#f59e0b',
  done: '#22c55e',
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newText, setNewText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Todo['status'] | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ columnKey: Todo['status']; index: number } | null>(null);
  const dragIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadTodos().then(setTodos);
  }, []);

  useEffect(() => {
    const handleNew = () => {
      const input = document.querySelector<HTMLInputElement>('.todo-add input');
      input?.focus();
    };
    window.addEventListener('dash:new-item', handleNew);
    return () => window.removeEventListener('dash:new-item', handleNew);
  }, []);

  const persist = useCallback((updated: Todo[]) => {
    setTodos(updated);
    saveTodos(updated);
  }, []);

  function addTodo() {
    if (!newText.trim()) return;
    const todo: Todo = {
      id: generateId(),
      text: newText.trim(),
      details: '',
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    };
    persist([todo, ...todos]);
    setNewText('');
  }

  function updateDetails(id: string, details: string) {
    persist(todos.map((t) => (t.id === id ? { ...t, details } : t)));
  }

  function removeTodo(id: string) {
    persist(todos.filter((t) => t.id !== id));
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => {
      if (prev === id) {
        setEditingDetailsId(null);
        return null;
      }
      return id;
    });
  }

  function moveToColumn(draggedId: string, targetStatus: Todo['status'], insertIndex: number) {
    const dragged = todos.find((t) => t.id === draggedId);
    if (!dragged) return;

    // Remove the dragged item
    const without = todos.filter((t) => t.id !== draggedId);

    // Find items in the target column (after removal)
    const columnItems = without.filter((t) => t.status === targetStatus);
    const otherItems = without.filter((t) => t.status !== targetStatus);

    // Insert at the right position within the column
    const clampedIndex = Math.min(insertIndex, columnItems.length);
    columnItems.splice(clampedIndex, 0, { ...dragged, status: targetStatus });

    // Rebuild: preserve order of other columns, replace target column items in-place
    const result: Todo[] = [];
    let colIdx = 0;
    for (const item of otherItems) {
      // Insert all target column items before the first item that originally came after them
      while (colIdx < columnItems.length) {
        result.push(columnItems[colIdx]);
        colIdx++;
      }
      result.push(item);
    }
    // Append remaining column items
    while (colIdx < columnItems.length) {
      result.push(columnItems[colIdx]);
      colIdx++;
    }

    // Simpler approach: group by status preserving order
    const grouped: Todo[] = [];
    for (const col of columns) {
      if (col.key === targetStatus) {
        grouped.push(...columnItems);
      } else {
        grouped.push(...without.filter((t) => t.status === col.key));
      }
    }

    persist(grouped);
  }

  // Drag handlers
  function handleDragStart(e: React.DragEvent, id: string) {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).classList.add('todo-card-dragging');
  }

  function handleDragEnd(e: React.DragEvent) {
    dragIdRef.current = null;
    setDragOverColumn(null);
    setDropIndicator(null);
    (e.currentTarget as HTMLElement).classList.remove('todo-card-dragging');
  }

  function handleColumnDragOver(e: React.DragEvent, colKey: Todo['status']) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(colKey);
  }

  function handleColumnDragLeave(e: React.DragEvent, colKey: Todo['status']) {
    const related = e.relatedTarget as HTMLElement | null;
    const current = e.currentTarget as HTMLElement;
    if (!related || !current.contains(related)) {
      if (dragOverColumn === colKey) setDragOverColumn(null);
      if (dropIndicator?.columnKey === colKey) setDropIndicator(null);
    }
  }

  function handleCardDragOver(e: React.DragEvent, colKey: Todo['status'], index: number) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(colKey);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertAt = e.clientY < midY ? index : index + 1;

    setDropIndicator({ columnKey: colKey, index: insertAt });
  }

  function handleBodyDragOver(e: React.DragEvent, colKey: Todo['status'], itemCount: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(colKey);
    // If dragging over the empty area below cards, insert at end
    setDropIndicator({ columnKey: colKey, index: itemCount });
  }

  function handleDrop(e: React.DragEvent, colKey: Todo['status']) {
    e.preventDefault();
    const id = dragIdRef.current;
    if (id) {
      const insertAt = dropIndicator?.columnKey === colKey ? dropIndicator.index : todos.filter((t) => t.status === colKey).length;
      moveToColumn(id, colKey, insertAt);
    }
    dragIdRef.current = null;
    setDragOverColumn(null);
    setDropIndicator(null);
  }

  return (
    <div className="todo-list">
      <h3>Todo List</h3>

      <div className="todo-add">
        <input
          type="text"
          placeholder="Add a new task..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
        />
        <button className="btn btn-start" onClick={addTodo} disabled={!newText.trim()}>
          Add
        </button>
      </div>

      <div className="todo-columns">
        {columns.map((col) => {
          const isOver = dragOverColumn === col.key;
          const colTodos = todos.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={'todo-column' + (isOver ? ' todo-column-dragover' : '')}
              onDragOver={(e) => handleColumnDragOver(e, col.key)}
              onDragLeave={(e) => handleColumnDragLeave(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="todo-column-header">
                <span
                  className="todo-column-dot"
                  style={{ background: statusColors[col.key] }}
                />
                <span>{col.label}</span>
                <span className="todo-column-count">
                  {colTodos.length}
                </span>
              </div>

              <div
                className="todo-column-body"
                onDragOver={(e) => handleBodyDragOver(e, col.key, colTodos.length)}
              >
                <AnimatePresence mode="popLayout">
                  {colTodos.map((todo, index) => {
                      const isExpanded = expandedId === todo.id;
                      const showIndicatorBefore =
                        dropIndicator?.columnKey === col.key &&
                        dropIndicator.index === index &&
                        dragIdRef.current !== todo.id;
                      const showIndicatorAfter =
                        dropIndicator?.columnKey === col.key &&
                        dropIndicator.index === index + 1 &&
                        index === colTodos.length - 1 &&
                        dragIdRef.current !== todo.id;

                      return (
                        <motion.div
                          key={todo.id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="todo-card-wrapper"
                        >
                          {showIndicatorBefore && <div className="todo-drop-indicator" />}
                          <div
                            className={'todo-card' + (isExpanded ? ' todo-card-expanded' : '')}
                            draggable
                            onDragStart={(e) => handleDragStart(e, todo.id)}
                            onDragEnd={(e) => handleDragEnd(e)}
                            onDragOver={(e) => handleCardDragOver(e, col.key, index)}
                          >
                            <div className="todo-card-header" onClick={() => toggleExpand(todo.id)}>
                              <span className="todo-drag-handle" title="Drag to move">⠿</span>
                              <span className="todo-text">{todo.text}</span>
                              <span className={'todo-chevron' + (isExpanded ? ' open' : '')}>
                                {todo.details || isExpanded ? '▾' : '＋'}
                              </span>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  className="todo-details"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {editingDetailsId === todo.id ? (
                                    <>
                                      <AutoResizeTextarea
                                        className="todo-details-input"
                                        placeholder="Add details (supports markdown)..."
                                        value={todo.details}
                                        onChange={(e) => updateDetails(todo.id, e.target.value)}
                                        autoFocus
                                      />
                                      <button
                                        className="todo-details-toggle"
                                        onClick={() => setEditingDetailsId(null)}
                                      >
                                        Preview
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      {todo.details ? (
                                        <div
                                          className="todo-details-preview"
                                          onClick={() => setEditingDetailsId(todo.id)}
                                        >
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
                                            {todo.details}
                                          </Markdown>
                                        </div>
                                      ) : (
                                        <div
                                          className="todo-details-empty"
                                          onClick={() => setEditingDetailsId(todo.id)}
                                        >
                                          Click to add details...
                                        </div>
                                      )}
                                      <button
                                        className="todo-details-toggle"
                                        onClick={() => setEditingDetailsId(todo.id)}
                                      >
                                        Edit
                                      </button>
                                    </>
                                  )}
                                  <div className="todo-actions">
                                    <button
                                      className="todo-move-btn todo-remove"
                                      onClick={() => removeTodo(todo.id)}
                                      title="Remove"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {showIndicatorAfter && <div className="todo-drop-indicator" />}
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
