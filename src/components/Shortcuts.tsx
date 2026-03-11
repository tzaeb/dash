import './Shortcuts.css';

const shortcuts = [
  {
    section: 'Navigation',
    items: [
      { keys: 'Alt + 1', action: 'Go to Time Tracker' },
      { keys: 'Alt + 2', action: 'Go to Todos' },
      { keys: 'Alt + 3', action: 'Go to Notes' },
      { keys: 'Alt + 4', action: 'Go to Links' },
      { keys: 'Alt + 5', action: 'Go to Dates' },
      { keys: '?', action: 'Open this shortcuts page' },
    ],
  },
  {
    section: 'Global',
    items: [
      { keys: 'Alt + D', action: 'Toggle dark / light mode' },
      { keys: '/', action: 'Focus search bar (Notes, Links)' },
      { keys: 'Escape', action: 'Close form / cancel editing / blur input' },
    ],
  },
  {
    section: 'Page Actions',
    items: [
      { keys: 'Alt + N', action: 'New item (note, link, or focus todo input)' },
      { keys: 'Alt + S', action: 'Stop running timer (Time Tracker)' },
    ],
  },
];

export default function Shortcuts() {
  return (
    <div className="shortcuts">
      <h3>Keyboard Shortcuts</h3>
      {shortcuts.map((group) => (
        <div key={group.section} className="shortcuts-section">
          <h4>{group.section}</h4>
          <div className="shortcuts-list">
            {group.items.map((item) => (
              <div key={item.keys} className="shortcut-row">
                <kbd className="shortcut-keys">
                  {item.keys.split(' + ').map((k, i) => (
                    <span key={k}>
                      {i > 0 && <span className="shortcut-plus">+</span>}
                      <span className="shortcut-key">{k}</span>
                    </span>
                  ))}
                </kbd>
                <span className="shortcut-action">{item.action}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
