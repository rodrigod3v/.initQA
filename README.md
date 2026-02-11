# .initQA: Professional API Orchestrator & QA Platform

A robust, full-stack application designed for managing complex API request collections, automated contract validation, side-by-side environment comparisons, and distributed load testing. Engineered for architectural excellence and optimized for low-resource environments (1GB RAM).

## 🚀 Key Features

- **Asynchronous Execution**: Background processing of heavy request chains and load tests via **BullMQ** and **Redis**.
- **Contract Validation**: Real-time JSON Schema validation using **AJV** and OpenAPI/Swagger synchronization.
- **Environment Intelligence**: Side-by-side response comparison with automated diff detection.
- **Load Testing**: Integrated **k6** engine for performance validation, triggered directly from the UI or CLI.
- **QA Utilities**: Built-in generators for CPF, UUID, and payload mutation (Fuzzing).
- **Advanced Web Orchestration (Road to 100%)**: Recursive iFrame discovery and support for complex interactions (`HOVER`, `DRAG_AND_DROP`, `SWITCH_FRAME`).
- **Outcome Observation**: Real-time monitoring of UI feedback, status codes, and dynamic notifications after interactions.
- **Self-Healing AI**: Smart element locator recovery using weighted scoring algorithms.
- **Visual Flow Builder**: Drag-and-drop scenario design with **ReactFlow**.
- **Real-Time Intelligence**: Live execution streaming and K6 performance telemetry via WebSockets.
- **Integrity Engine**: Historical heatmaps for spotting performance degradation.
- **Professional CLI**: Dedicated CI/CD runner with smart exit codes for pipeline integration.

## 🏗️ Architecture

The platform follows a modular, feature-driven design optimized for scalability:

- **Backend**: NestJS (Fastify) + Prisma ORM.
- **Frontend**: React (Vite) + Tailwind CSS 4 + Zustand.
- **Persistence**: **PostgreSQL** for high-concurrency data management.
- **Messaging**: **Redis** as a broker for task orchestration.
- **Infrastructure**: Fully Dockerized with multi-stage builds and strict resource isolation.

## 🛠️ Tech Stack

### Frontend
- React 18 / Vite / TypeScript
- **State**: Zustand
- **Graphics**: Lucide React / HSL-based Curated Palettes
- **Visuals**: ReactFlow / Recharts
- **Real-Time**: Socket.io Client
- **Editor**: Monaco Editor (Lazy-Loaded)

### Backend
- NestJS (Fastify Adapter)
- **Database**: PostgreSQL
- **Queue**: BullMQ + Redis
- **Logging**: Structured Pino (+ Pino-Pretty for Dev)
- **Validation**: AJV / Class-Validator

## 📦 Getting Started

### Prerequisites
- Node.js v20+
- Docker & Docker Compose (Highly Recommended)

### Quick Start (Local Development)
1. Install dependencies: `npm install`
2. Start concurrently: `npm run dev`

### Production Deployment (Docker)
Optimized for 1GB RAM VM environments:
```bash
docker compose up -d --build
```
*Resource limits are enforced via `docker-compose.yml`: API (384MB), Postgres (256MB), Redis (128MB), Nginx (128MB).*

## 🛠️ Internal CLI (`initqa-cli`)
Trigger project executions directly from your CI/CD pipeline:
```bash
npm run initqa-run -- -p <project_id> -e <env_id> -t <token>
```

## 📂 Project Structure
```text
.
├── backend/                # NestJS API & Workers
│   ├── src/queue/          # BullMQ Logic
│   └── src/cli/            # CI/CD Runner
├── frontend/               # React SPA
├── nginx/                  # Production Reverse Proxy Config
├── prisma/                 # PostgreSQL Schema
└── docker-compose.yml      # Service Orchestration
```

## 🔒 Security & Best Practices
- **Isolation**: Stateless background workers for resource management.
- **Validation**: Strict DTO and JSON Schema enforcement on all entry points.
- **Optimization**: Multi-stage builds and internal swap configuration for stability.

---
*Optimized for Architectural Excellence. Designed for QA Professionals.*
