import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { principles } from '../data/principles';
import { type Todo, loadTodos } from '../api';
import './Tagline.css';

export default function Tagline() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    loadTodos().then(setTodos);
  }, []);

  const principle = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return principles[dayOfYear % principles.length];
  }, []);

  const counts = useMemo(() => ({
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
    </div>
  );
}
