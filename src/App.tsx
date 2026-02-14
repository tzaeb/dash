import { Routes, Route, NavLink } from 'react-router-dom';
import Tagline from './components/Tagline';
import TimeTracker from './components/TimeTracker';
import TodoList from './components/TodoList';
import Notes from './components/Notes';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1><NavLink to="/" className="app-title-link">Dash</NavLink></h1>
        <nav className="app-nav">
          <NavLink to="/tracker">Time Tracker</NavLink>
          <NavLink to="/todos">Todos</NavLink>
          <NavLink to="/notes">Notes</NavLink>
        </nav>
      </header>
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Tagline />} />
          <Route path="/tracker" element={<TimeTracker />} />
          <Route path="/todos" element={<TodoList />} />
          <Route path="/notes" element={<Notes />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
