#!/bin/bash
# Start backend with memory limit for 1GB RAM VM
export NODE_ENV=production
cd backend/api
node --max-old-space-size=256 dist/main.js
