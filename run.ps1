#!/usr/bin/env pwsh
# Run mode - localhost only
npx concurrently "npx vite" "npx tsx server/index.ts"
