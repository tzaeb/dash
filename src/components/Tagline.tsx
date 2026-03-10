import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { principles } from '../data/principles';
import { type Todo, type Link, type ImportantDate, loadTodos, loadLinks, loadDates } from '../api';
import './Tagline.css';

export default function Tagline() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [dates, setDates] = useState<ImportantDate[]>([]);

  useEffect(() => {
    loadTodos().then(setTodos);
    loadLinks().then(setLinks);
    loadDates().then(setDates);
  }, []);

  const upcomingDates = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return [...dates]
      .filter((d) => new Date(d.date + 'T00:00:00') >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [dates]);

  const topLinks = useMemo(
    () =>
      [...links]
        .filter((l) => (l.clickCount || 0) > 0)
        .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))
        .slice(0, 5),
    [links]
  );

  const principle = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return principles[dayOfYear % principles.length];
  }, []);

  const counts = useMemo(() => ({
    today: todos.filter((t) => t.status === 'today').length,
    inProgress: todos.filter((t) => t.status === 'in_progress').length,
    waiting: todos.filter((t) => t.status === 'waiting').length,
    done: todos.filter((t) => t.status === 'done').length,
    total: todos.length,
  }), [todos]);

  return (
    <div className="home">
      <motion.div
        className="tagline"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="tagline-label">Principle of the Day</span>
        <h2 className="tagline-name">{principle.name}</h2>
        <p className="tagline-desc">{principle.description}</p>
      </motion.div>

      {counts.total > 0 && (
        <motion.div
          className="home-stats"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h3 className="home-stats-title">Todos</h3>
          <div className="home-stats-row">
            <div className="home-stat">
              <span className="home-stat-value" style={{ color: '#8b5cf6' }}>
                {counts.today}
              </span>
              <span className="home-stat-label">Today</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value" style={{ color: '#3b82f6' }}>
                {counts.inProgress}
              </span>
              <span className="home-stat-label">In Progress</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value" style={{ color: '#f59e0b' }}>
                {counts.waiting}
              </span>
              <span className="home-stat-label">Waiting</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value" style={{ color: '#22c55e' }}>
                {counts.done}
              </span>
              <span className="home-stat-label">Done</span>
            </div>
          </div>
        </motion.div>
      )}

      {topLinks.length > 0 && (
        <motion.div
          className="home-top-links"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h3 className="home-stats-title">
            Top Links
            <NavLink to="/links" className="home-section-link">View all</NavLink>
          </h3>
          <div className="home-links-list">
            {topLinks.map((link) => (
              <a
                key={link.id}
                href={link.type === 'web' ? link.url : undefined}
                target={link.type === 'web' ? '_blank' : undefined}
                rel={link.type === 'web' ? 'noopener noreferrer' : undefined}
                className="home-link-item"
                title={link.url}
                onClick={
                  link.type === 'folder'
                    ? (e) => {
                        e.preventDefault();
                        fetch('/api/open-folder', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ folderPath: link.url }),
                        });
                      }
                    : undefined
                }
              >
                <span className="home-link-icon">
                  {link.type === 'web' ? '\uD83C\uDF10' : '\uD83D\uDCC1'}
                </span>
                <span className="home-link-title">{link.title}</span>
                <span className="home-link-count">{link.clickCount}</span>
              </a>
            ))}
          </div>
        </motion.div>
      )}

      {upcomingDates.length > 0 && (() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const furthest = Math.max(
          ...upcomingDates.map((d) =>
            Math.round((new Date(d.date + 'T00:00:00').getTime() - now.getTime()) / 86400000)
          ),
          1
        );
        const maxDays = Math.max(furthest, 90);

        // Build month ticks between today and the furthest date
        const monthTicks: { label: string; pct: number }[] = [];
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + maxDays);
        const tick = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        while (tick <= endDate) {
          const tickDays = Math.round((tick.getTime() - now.getTime()) / 86400000);
          const pct = (tickDays / maxDays) * 100;
          if (pct > 3 && pct < 97) {
            monthTicks.push({
              label: tick.toLocaleDateString('default', { month: 'short' }),
              pct,
            });
          }
          tick.setMonth(tick.getMonth() + 1);
        }

        // Add week ticks if span is short (< 60 days) and no month ticks
        const weekTicks: { label: string; pct: number }[] = [];
        if (maxDays <= 60) {
          for (let w = 7; w < maxDays; w += 7) {
            const pct = (w / maxDays) * 100;
            if (pct > 5 && pct < 95) {
              weekTicks.push({ label: `W${Math.ceil(w / 7)}`, pct });
            }
          }
        }

        const ticks = monthTicks.length > 0 ? monthTicks : weekTicks;

        return (
          <motion.div
            className="home-top-links"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <h3 className="home-stats-title">
              Upcoming
              <NavLink to="/dates" className="home-section-link">View all</NavLink>
            </h3>
            <div className="tl-bar-wrapper">
              <div className="tl-labels">
                <span className="tl-label-start">Today</span>
                <span className="tl-label-end">
                  {endDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="tl-bar">
                {/* Tick marks for scale */}
                {ticks.map((t) => (
                  <div key={t.label} className="tl-tick" style={{ left: `${t.pct}%` }}>
                    <span className="tl-tick-label">{t.label}</span>
                  </div>
                ))}
                {/* Event markers */}
                {upcomingDates.map((d, i) => {
                  const dateObj = new Date(d.date + 'T00:00:00');
                  const diffDays = Math.round((dateObj.getTime() - now.getTime()) / 86400000);
                  const pct = (diffDays / maxDays) * 100;
                  const isToday = diffDays === 0;
                  const above = i % 2 === 1;
                  return (
                    <motion.div
                      key={d.id}
                      className={`tl-marker${isToday ? ' is-today' : ''}${above ? ' above' : ''}`}
                      style={{ left: `${pct}%` }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                    >
                      <div className="tl-marker-dot" />
                      <div className={`tl-marker-label${pct > 80 ? ' align-right' : pct < 5 ? ' align-left' : ''}`}>
                        <span className="tl-marker-title">{d.title}</span>
                        <span className="tl-marker-sub">
                          {isToday
                            ? 'today'
                            : diffDays === 1
                            ? 'tomorrow'
                            : `${diffDays}d`}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
}
