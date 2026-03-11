import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ImportantDate, generateId, loadDates, saveDates } from '../api';
import './Dates.css';

function formatRelative(dateStr: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

function getDateStatus(dateStr: string): 'past' | 'today' | 'future' {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = target.getTime() - now.getTime();
  if (diff < 0) return 'past';
  if (diff === 0) return 'today';
  return 'future';
}

export default function Dates() {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState('');

  useEffect(() => {
    loadDates().then(setDates);
  }, []);

  useEffect(() => {
    const handleNew = () => setShowForm(true);
    const handleEscape = () => resetForm();
    window.addEventListener('dash:new-item', handleNew);
    window.addEventListener('dash:escape', handleEscape);
    return () => {
      window.removeEventListener('dash:new-item', handleNew);
      window.removeEventListener('dash:escape', handleEscape);
    };
  });

  const persist = useCallback((updated: ImportantDate[]) => {
    setDates(updated);
    saveDates(updated);
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
    return {
      upcoming: sorted.filter((d) => new Date(d.date + 'T00:00:00') >= now),
      past: sorted.filter((d) => new Date(d.date + 'T00:00:00') < now).reverse(),
    };
  }, [dates]);

  function resetForm() {
    setFormTitle('');
    setFormDesc('');
    setFormDate('');
    setShowForm(false);
    setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = formTitle.trim();
    const date = formDate.trim();
    if (!title || !date) return;

    const data = {
      title,
      description: formDesc.trim(),
      date,
    };

    if (editingId) {
      persist(
        dates.map((d) => (d.id === editingId ? { ...d, ...data } : d))
      );
    } else {
      persist([
        ...dates,
        { id: generateId(), ...data, createdAt: new Date().toISOString() },
      ]);
    }
    resetForm();
  }

  function startEdit(d: ImportantDate) {
    setEditingId(d.id);
    setFormTitle(d.title);
    setFormDesc(d.description);
    setFormDate(d.date);
    setShowForm(true);
  }

  function deleteDate(id: string) {
    persist(dates.filter((d) => d.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <div className="dates">
      <div className="dates-toolbar">
        <button
          className="btn btn-start"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
        >
          {showForm ? 'Cancel' : 'Add Date'}
        </button>
      </div>

      {showForm && (
        <form className="dates-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />
          <button type="submit" className="btn btn-start">
            {editingId ? 'Update' : 'Save'}
          </button>
        </form>
      )}

      {dates.length === 0 && (
        <div className="dates-empty">No dates yet — add one above</div>
      )}

      {upcoming.length > 0 && (
        <>
          <h3 className="dates-section-title">Upcoming</h3>
          <div className="dates-list">
            <AnimatePresence mode="popLayout">
              {upcoming.map((d) => {
                const status = getDateStatus(d.date);
                const dateObj = new Date(d.date + 'T00:00:00');
                const month = dateObj.toLocaleString('default', { month: 'short' });
                const day = dateObj.getDate();
                return (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="date-card"
                  >
                    <div className="date-card-main">
                      <div className={`date-badge is-${status}`}>
                        <span className="date-badge-month">{month}</span>
                        <span className="date-badge-day">{day}</span>
                      </div>
                      <div className="date-info">
                        <div className="date-title">
                          {d.title}
                          <span className="date-relative">{formatRelative(d.date)}</span>
                        </div>
                        {d.description && (
                          <div className="date-desc">{d.description}</div>
                        )}
                        <div className="date-full-date">
                          {dateObj.toLocaleDateString('default', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div className="date-actions">
                        <button className="date-action-btn" onClick={() => startEdit(d)} title="Edit">Edit</button>
                        <button className="date-action-btn date-action-del" onClick={() => deleteDate(d.id)} title="Delete">Del</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h3 className="dates-section-title dates-section-past">Past</h3>
          <div className="dates-list">
            <AnimatePresence mode="popLayout">
              {past.map((d) => {
                const dateObj = new Date(d.date + 'T00:00:00');
                const month = dateObj.toLocaleString('default', { month: 'short' });
                const day = dateObj.getDate();
                return (
                  <motion.div
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="date-card date-card-past"
                  >
                    <div className="date-card-main">
                      <div className="date-badge is-past">
                        <span className="date-badge-month">{month}</span>
                        <span className="date-badge-day">{day}</span>
                      </div>
                      <div className="date-info">
                        <div className="date-title">
                          {d.title}
                          <span className="date-relative">{formatRelative(d.date)}</span>
                        </div>
                        {d.description && (
                          <div className="date-desc">{d.description}</div>
                        )}
                      </div>
                      <div className="date-actions">
                        <button className="date-action-btn" onClick={() => startEdit(d)} title="Edit">Edit</button>
                        <button className="date-action-btn date-action-del" onClick={() => deleteDate(d.id)} title="Delete">Del</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
