#!/usr/bin/env bash
# Run mode - localhost only
npx concurrently "npx vite" "npx tsx server/index.ts"
