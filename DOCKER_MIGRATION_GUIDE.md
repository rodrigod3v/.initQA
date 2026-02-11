# .initQA: Docker Migration & Architectural Upgrade Guide

This guide documents the significant architectural changes introduced in the `docker-init` branch. These changes transition the platform from a local-only SQLite setup to a production-ready, Dockerized environment with high concurrency support.

## 🏗️ New Architectural Overview

The application has been decomposed into a multi-container architecture for better resource isolation and scalability:

- **PostgreSQL**: Replaces SQLite to handle concurrent data access and larger logs.
- **Redis**: Acts as the message broker for background task queueing.
- **BullMQ Workers**: Separate background processes for long-running executions (Request Chains, Load Tests).
- **NestJS API**: Lightweight API layer focused on orchestration.
- **Nginx**: Reverse proxy and static file server for the React frontend.

## 🚀 Deployment (Docker Compose)

To start the entire stack, use the following command from the root directory:

```bash
docker compose up -d --build
```

### Resource Limits (1GB RAM Optimization)
Each service is constrained to ensure stability on low-resource VMs:
- **Postgres**: 256MB
- **Redis**: 128MB
- **Backend (NestJS/BullMQ)**: 384MB
- **Frontend (Nginx)**: 128MB

## 🛠️ Enhanced CLI Tooling

The CI runner has been upgraded to a professional CLI tool:
- **Command**: `npm run initqa-run`
- **Options**:
  - `-p, --project-id <id>`: Target project ID
  - `-e, --env-id <id>`: Target environment ID
  - `-t, --token <token>`: Auth token
  - `-r, --report-format <type>`: Output format (default: console)

## 📦 Containerization Details

- **Multi-Stage Builds**: Optimized for smaller image sizes.
- **Pre-installed k6**: The backend image includes the `k6` binary, eliminating the need for manual setup on the VM.
- **Environment Management**: Use a `.env` file in the root directory to configure secrets and connection strings.

## 🔧 Post-Merge Steps

1. **Database Migration**: After merging, ensure you run `npx prisma migrate deploy` or allow the Docker container to handle it via the startup script.
2. **Environment Variables**: Update your local `.env` with `DATABASE_URL` (Postgres) and `REDIS_HOST`/`REDIS_PORT`.
3. **Task Queue**: Ensure Redis is running; otherwise, request executions will fail to queue.

---
*Prepared by Antigravity for .initQA Team.*
