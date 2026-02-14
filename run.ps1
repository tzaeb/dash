#!/usr/bin/env pwsh
# Run mode - accessible on the network (0.0.0.0)
$env:HOST = "0.0.0.0"
npx concurrently "npx vite --host 0.0.0.0" "npx tsx server/index.ts"
