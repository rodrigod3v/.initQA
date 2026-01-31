@echo off
SET NODE_ENV=production
cd backend\api
node --max-old-space-size=256 dist/main.js
