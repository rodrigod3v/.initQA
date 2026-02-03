# InitQA - Web Automation & Testing Suite

## 🚀 Overview

**InitQA** is a comprehensive, lightweight web automation and Quality Assurance tool designed to streamline the creation, execution, and monitoring of web scenarios. Built with performance in mind (optimized for low-resource environments like 1GB RAM VMs), it provides a modern interface for managing functional tests without the overhead of enterprise-grade suites.

The platform treats "Infrastructure-as-Code" seriously, offering a dual-mode editor (Visual & JSON Script) to cater to both manual testers and automation engineers.

## ✨ Key Features

### 🎬 Scenario Management
- **CRUD Operations**: Complete management (Create, Read, Update, Delete) of test scenarios.
- **Visual Step Builder**: Intuitive UI to add steps like `GOTO`, `CLICK`, `FILL`, `ASSERT_VISIBLE`, etc.
- **Script Mode (QA-as-Code)**: Direct JSON editing for power users, enabling copy/paste of complex workflows and version control friendly formats.
- **Validation**: Built-in safeguards preventing invalid steps from being saved.

### ⚡ Execution Engine
- **Batch Execution**: Run multiple scenarios simultaneously with a single click.
- **Environment Support**: Dynamic variable injection (e.g., `{{baseUrl}}`) to switch between Dev, Staging, and Prod.
- **Real-time Feedback**: Live status updates during test runs.
- **Headless Automation**: Powered by backend automation (Puppeteer/Playwright) for consistent results.

### 📊 Activity & Insights
- **Global Activity Feed**: A centralized timeline showing all execution history across the project.
- **Visual Proof**: Automatic screenshot capture for both success final states and failure points.
- **Detailed Logs**: Step-by-step auditing with timing information (ms) for performance bottleneck analysis.

## 🛠️ Technology Stack

**Frontend**
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS + Custom "Deep Space" Theme
- **Icons**: Lucide React
- **HTTP Client**: Axios

**Backend**
- **Framework**: NestJS
- **Database**: SQLite (via Prisma ORM) for lightweight, portable data storage.
- **Automation**: Custom automation services (Puppeteer-based).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- NPM or Yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/init-qa.git
    cd init-qa
    ```

2.  **Install Dependencies:**
    ```bash
    # Root installation (if configured) or individual folders
    cd frontend && npm install
    cd ../backend && npm install
    ```

3.  **Database Setup:**
    ```bash
    cd backend
    npx prisma generate
    npx prisma migrate dev --name init
    ```

### Running the Application

**Backend (API & Automation Engine)**
```bash
cd backend
npm run start:dev
# Running on http://localhost:3000
```

**Frontend (Dashboard)**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

## 📖 Usage Guide

1.  **Create a Project**: Select or create a new project scope.
2.  **Define Environment**: (Optional) specific variables like Base URLs.
3.  **Build a Scenario**:
    *   Click `+` in the sidebar.
    *   Add steps using the **Visual Builder** or **Script Mode**.
    *   Example Step: `{ "type": "GOTO", "value": "https://google.com" }`
4.  **Run Tests**:
    *   **Single Run**: Select a scenario and click `RUN`.
    *   **Suite Run**: Click `RUN PROJECT SUITE` to execute all.
5.  **Analyze**: Check the **Global Activity Feed** for results, logs, and screenshots.

## 🤝 Contribution

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---
*Built with ❤️ for the QA Community.*
