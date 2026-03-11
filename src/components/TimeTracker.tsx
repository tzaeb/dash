import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { type TimeEntry, generateId, loadTimeEntries, saveTimeEntries } from '../api';
import './TimeTracker.css';

function formatDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(date: Date) {
  const d = getStartOfDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

type View = 'daily' | 'weekly';

export default function TimeTracker() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [project, setProject] = useState('');
  const [view, setView] = useState<View>('daily');
  const [now, setNow] = useState(Date.now());
  const [showLog, setShowLog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    loadTimeEntries().then(setEntries);
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      if (activeEntry) handleStop();
    };
    window.addEventListener('dash:toggle-timer', handleToggle);
    return () => window.removeEventListener('dash:toggle-timer', handleToggle);
  });



  useEffect(() => {
    const hasRunning = entries.some((e) => !e.endTime);
    if (hasRunning) {
      timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [entries]);

  const persist = useCallback((updated: TimeEntry[]) => {
    setEntries(updated);
    saveTimeEntries(updated);
  }, []);

  const activeEntry = entries.find((e) => !e.endTime);

  function handleStart() {
    if (!project.trim() || activeEntry) return;
    const entry: TimeEntry = {
      id: generateId(),
      project: project.trim(),
      startTime: new Date().toISOString(),
      endTime: null,
    };
    persist([...entries, entry]);
    setProject('');
  }

  function handleStop() {
    if (!activeEntry) return;
    persist(
      entries.map((e) =>
        e.id === activeEntry.id ? { ...e, endTime: new Date().toISOString() } : e
      )
    );
  }

  function updateEntry(id: string, field: 'startTime' | 'endTime', value: string) {
    persist(
      entries.map((e) =>
        e.id === id ? { ...e, [field]: new Date(value).toISOString() } : e
      )
    );
  }

  function deleteEntry(id: string) {
    persist(entries.filter((e) => e.id !== id));
  }

  // Compute breakdown
  const cutoff = view === 'daily' ? getStartOfDay(new Date()) : getStartOfWeek(new Date());
  const filtered = entries.filter((e) => new Date(e.startTime) >= cutoff);

  const projectMap: Record<string, { ms: number; sessions: number }> = {};
  let totalMs = 0;

  for (const e of filtered) {
    const end = e.endTime ? new Date(e.endTime).getTime() : now;
    const dur = end - new Date(e.startTime).getTime();
    if (!projectMap[e.project]) projectMap[e.project] = { ms: 0, sessions: 0 };
    projectMap[e.project].ms += dur;
    projectMap[e.project].sessions += 1;
    totalMs += dur;
  }

  const breakdown = Object.entries(projectMap)
    .map(([name, { ms, sessions }]) => ({
      name,
      ms,
      sessions,
      pct: totalMs > 0 ? (ms / totalMs) * 100 : 0,
    }))
    .sort((a, b) => b.ms - a.ms);

  // Day timeline with break detection
  const dayTimeline = useMemo(() => {
    const todayStart = getStartOfDay(new Date());
    const todayCompleted = entries
      .filter((e) => new Date(e.startTime) >= todayStart && e.endTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (todayCompleted.length === 0) return null;

    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    const durStr = (ms: number) => {
      const m = Math.round(ms / 60000);
      if (m < 60) return `${m}m`;
      return `${Math.floor(m / 60)}h ${(m % 60).toString().padStart(2, '0')}m`;
    };

    const segments: { type: 'work' | 'break'; start: string; end: string; project?: string; durationMs: number }[] = [];
    for (let i = 0; i < todayCompleted.length; i++) {
      const e = todayCompleted[i];
      segments.push({
        type: 'work',
        start: e.startTime,
        end: e.endTime!,
        project: e.project,
        durationMs: new Date(e.endTime!).getTime() - new Date(e.startTime).getTime(),
      });
      if (i < todayCompleted.length - 1) {
        const next = todayCompleted[i + 1];
        const gap = new Date(next.startTime).getTime() - new Date(e.endTime!).getTime();
        if (gap > 5 * 60000) {
          segments.push({
            type: 'break',
            start: e.endTime!,
            end: next.startTime,
            durationMs: gap,
          });
        }
      }
    }

    return { segments, fmt, durStr };
  }, [entries]);

  return (
    <div className="time-tracker">
      <h3>Time Tracker</h3>

      <div className="tt-controls">
        {!activeEntry ? (
          <>
            <input
              type="text"
              placeholder="Project name..."
              value={project}
              onChange={(e) => setProject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            />
            <button className="btn btn-start" onClick={handleStart} disabled={!project.trim()}>
              Start
            </button>
          </>
        ) : (
          <div className="tt-active">
            <span className="tt-pulse" />
            <span className="tt-project">{activeEntry.project}</span>
            <span className="tt-elapsed">
              {formatDuration(now - new Date(activeEntry.startTime).getTime())}
            </span>
            <button className="btn btn-stop" onClick={handleStop}>
              Stop
            </button>
          </div>
        )}
      </div>

      {dayTimeline && (
        <>
          <button
            className="tt-log-toggle"
            onClick={() => setShowDaySummary(!showDaySummary)}
          >
            {showDaySummary ? 'Hide' : 'Show'} day summary
          </button>
          {showDaySummary && (
            <div className="tt-day-summary visible">
              <div className="day-timeline">
                {dayTimeline.segments.map((seg, i) => (
                  <div key={i} className={`dt-row dt-${seg.type}`}>
                    <span className="dt-time">{dayTimeline.fmt(seg.start)}</span>
                    <span className="dt-dash">&ndash;</span>
                    <span className="dt-time">{dayTimeline.fmt(seg.end)}</span>
                    <span className="dt-label">
                      {seg.type === 'work' ? seg.project : 'Break'}
                    </span>
                    <span className="dt-dur">{dayTimeline.durStr(seg.durationMs)}</span>
                  </div>
                ))}
              </div>
              {activeEntry && (
                <div className="dt-row dt-work" style={{ marginTop: '0.25rem' }}>
                  <span className="dt-time">{dayTimeline.fmt(activeEntry.startTime)}</span>
                  <span className="dt-dash">&ndash;</span>
                  <span className="dt-time" style={{ fontStyle: 'italic', color: '#ef4444' }}>now</span>
                  <span className="dt-label">{activeEntry.project}</span>
                  <span className="dt-dur">{dayTimeline.durStr(now - new Date(activeEntry.startTime).getTime())}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="tt-view-toggle">
        <button className={view === 'daily' ? 'active' : ''} onClick={() => setView('daily')}>
          Today
        </button>
        <button className={view === 'weekly' ? 'active' : ''} onClick={() => setView('weekly')}>
          This Week
        </button>
      </div>

      {breakdown.length > 0 ? (
        <>
          <table className="tt-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Time</th>
                <th>Sessions</th>
                <th>%</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{formatDuration(row.ms)}</td>
                  <td>{row.sessions}</td>
                  <td>{row.pct.toFixed(1)}%</td>
                  <td>
                    <div className="tt-bar">
                      <div className="tt-bar-fill" style={{ width: `${row.pct}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td><strong>{formatDuration(totalMs)}</strong></td>
                <td><strong>{filtered.length}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <button
            className="tt-log-toggle"
            onClick={() => setShowLog(!showLog)}
          >
            {showLog ? 'Hide' : 'Show'} session log
          </button>

          {showLog && (
            <table className="tt-table tt-log-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].reverse().map((entry) => {
                  const isEditing = editingId === entry.id;
                  const endMs = entry.endTime ? new Date(entry.endTime).getTime() : now;
                  const dur = endMs - new Date(entry.startTime).getTime();

                  return (
                    <tr key={entry.id} className={!entry.endTime ? 'tt-log-running' : ''}>
                      <td>{entry.project}</td>
                      <td>{formatDate(entry.startTime)}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="datetime-local"
                            className="tt-edit-input"
                            defaultValue={toLocalDatetimeValue(entry.startTime)}
                            onChange={(e) => updateEntry(entry.id, 'startTime', e.target.value)}
                          />
                        ) : (
                          formatTime(entry.startTime)
                        )}
                      </td>
                      <td>
                        {!entry.endTime ? (
                          <span className="tt-log-active">running</span>
                        ) : isEditing ? (
                          <input
                            type="datetime-local"
                            className="tt-edit-input"
                            defaultValue={toLocalDatetimeValue(entry.endTime)}
                            onChange={(e) => updateEntry(entry.id, 'endTime', e.target.value)}
                          />
                        ) : (
                          formatTime(entry.endTime)
                        )}
                      </td>
                      <td>{formatDuration(dur)}</td>
                      <td className="tt-log-actions">
                        <button
                          className="tt-log-btn"
                          onClick={() => setEditingId(isEditing ? null : entry.id)}
                        >
                          {isEditing ? 'Done' : 'Edit'}
                        </button>
                        <button
                          className="tt-log-btn tt-log-btn-del"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <p className="tt-empty">No time tracked {view === 'daily' ? 'today' : 'this week'}.</p>
      )}
    </div>
  );
}
