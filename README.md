# Dash

A lightweight personal productivity dashboard built with React, TypeScript, and Express.

## Features

### Principle of the Day

Displays a randomly selected software engineering principle as the app's tagline. A curated list of 20 principles (KISS, YAGNI, DRY, SOLID, etc.) is rotated daily.

### Time Tracker

Track time spent on projects with a simple start/stop interface.

- Start/stop timer per project
- View daily and weekly breakdowns with hours and percentage allocation
- Collapsible day summary and session log

### Todo List

A minimal task board with three columns: **In Progress**, **Waiting**, and **Done**.

- Click to transition tasks between states
- Smooth spring animations on state changes (Framer Motion)
- Add and remove tasks

### Notes

A markdown-based notes editor for quick notes and documentation.

- Create, edit, and delete notes
- Full Markdown rendering with GFM support
- Live preview

## Tech Stack

- **Frontend:** React 19 · TypeScript · Vite
- **Animations:** Framer Motion
- **Backend:** Express.js (minimal JSON file API)
- **Storage:** Local JSON files in `data/` (gitignored — your data stays local)

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode (frontend + API server)
npm run dev
```

The frontend runs on `http://localhost:5173` and the API server on port `3001`.

### Production

```bash
# Build the frontend
npm run build

# Start the server (serves API + built frontend)
npm start
```

The app will be available at `http://localhost:3001`.

### Network Mode

To expose the dev server on your local network:

```bash
.\run.ps1          # Windows
# or manually:
npx concurrently "npx vite --host 0.0.0.0" "npx tsx server/index.ts"
```

### Environment Variables

| Variable | Default     | Description                |
| -------- | ----------- | -------------------------- |
| `PORT`   | `3001`      | API server port            |
| `HOST`   | `localhost` | API server bind address    |

## Project Structure

```
src/
  components/     # React components (TimeTracker, TodoList, Notes, Tagline)
  data/           # Static data (principles list)
  api.ts          # Frontend API client
server/
  index.ts        # Express API server
data/
  *.json          # Runtime data files (gitignored)
  *.example.json  # Example data for reference
```

## License

[MIT](LICENSE)

