#!/usr/bin/env pwsh
# Dev mode - localhost only
npx concurrently "npx vite" "npx tsx server/index.ts"
