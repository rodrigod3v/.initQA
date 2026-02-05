# QA API Orchestrator & Execution Tool

A professional-grade, full-stack application designed for managing HTTP request collections, web scenarios, and load testing. This project features a modern, modular architecture with a NestJS backend and a Vite-powered React frontend.

## 🏗️ Architecture

This project follows a **Feature-Driven Design (FDD)** on the frontend and a **Flattened Modular** pattern on the backend, ensuring extreme scalability and maintainability.

### High-Level Structure
- **Root**: Workspace management and common configuration.
- **`backend/`**: NestJS application using Prisma ORM.
  - Standardized modules with dedicated DTOs and Entities.
  - Consolidated root structure for faster discovery.
- **`frontend/`**: React application built with Vite.
  - **`src/features/`**: Complex business logic extracted into custom hooks and components.
  - **`src/shared/`**: Centralized UI design system, API services, and global types.
  - **Path Aliases**: Clean imports via `@/` (e.g., `@/shared/ui/Button`).

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS / Vanilla CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Editor**: Monaco Editor

### Backend
- **Framework**: NestJS
- **ORM**: Prisma
- **Database**: SQLite (default)
- **Validation**: Class-validator / DTOs

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
From the root directory, install all dependencies for the entire workspace:
```bash
npm install
```

### Development
Start both the backend and frontend concurrently in watch mode:
```bash
npm run dev
```

### Build
Generate production-ready bundles for both layers:
```bash
npm run build
```

## 📂 Project Organization

```text
.
├── backend/                # NestJS API Root
│   ├── src/                # Shared source code
│   │   ├── auth/           # Authentication logic
│   │   ├── project/        # Project & Environment management
│   │   ├── request/        # Request execution & collection
│   │   └── ...             # Other modular features
│   └── prisma/             # Database schema & migrations
├── frontend/               # React Application Root
│   ├── src/
│   │   ├── features/       # Business-specific logic (Hooks/View)
│   │   ├── shared/         # Universal UI, API helpers, & Types
│   │   ├── pages/          # Entry-point view components
│   │   └── ...
└── package.json            # Root workspace configuration
```

## 🔒 Security & Best Practices
- **DTO Validation**: All API inputs are strictly validated at the controller level.
- **Environment Isolation**: Secrets are managed via `.env` files (excluded from version control).
- **Modular Hooks**: Business logic is decoupled from UI presentation for easier testing.

---
*Created with focus on architectural excellence.*
