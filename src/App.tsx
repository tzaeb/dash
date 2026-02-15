import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Tagline from './components/Tagline';
import TimeTracker from './components/TimeTracker';
import TodoList from './components/TodoList';
import Notes from './components/Notes';
import Links from './components/Links';
import Dates from './components/Dates';
import Shortcuts from './components/Shortcuts';
import './App.css';

function App() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('dash-dark-mode');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('dash-dark-mode', String(darkMode));
  }, [darkMode]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
        e.preventDefault();
      }
      return;
    }

    if (e.altKey) {
      switch (e.key) {
        case '1': e.preventDefault(); navigate('/tracker'); break;
        case '2': e.preventDefault(); navigate('/todos'); break;
        case '3': e.preventDefault(); navigate('/notes'); break;
        case '4': e.preventDefault(); navigate('/links'); break;
        case '5': e.preventDefault(); navigate('/dates'); break;
        case 'd': e.preventDefault(); setDarkMode(prev => !prev); break;
        case 'n': {
          e.preventDefault();
          const event = new CustomEvent('dash:new-item');
          window.dispatchEvent(event);
          break;
        }
        case 's': {
          e.preventDefault();
          const event = new CustomEvent('dash:toggle-timer');
          window.dispatchEvent(event);
          break;
        }
      }
    }

    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const search = document.querySelector<HTMLInputElement>('.links-search, .notes-search');
      search?.focus();
    }

    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      navigate('/shortcuts');
    }

    if (e.key === 'Escape') {
      const event = new CustomEvent('dash:escape');
      window.dispatchEvent(event);
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="theme-toggle"
          onClick={() => setDarkMode(prev => !prev)}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '\u2600' : '\u263E'}
        </button>
        <h1><NavLink to="/" className="app-title-link"><img src="/dash.svg" alt="" className="app-logo" />Dash</NavLink></h1>
        <nav className="app-nav">
          <NavLink to="/tracker">Time Tracker</NavLink>
          <NavLink to="/todos">Todos</NavLink>
          <NavLink to="/notes">Notes</NavLink>
          <NavLink to="/links">Links</NavLink>
          <NavLink to="/dates">Dates</NavLink>
          <NavLink to="/shortcuts" title="Keyboard Shortcuts (?)">Shortcuts</NavLink>
        </nav>
      </header>
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Tagline />} />
          <Route path="/tracker" element={<TimeTracker />} />
          <Route path="/todos" element={<TodoList />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/links" element={<Links />} />
          <Route path="/dates" element={<Dates />} />
          <Route path="/shortcuts" element={<Shortcuts />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
