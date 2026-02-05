# API Documentation with Swagger

Our project uses **OpenAPI (Swagger)** to provide an interactive and self-documenting interface for the backend API. This allows developers to explore endpoints, view data structures (DTOs), and execute requests directly from the browser.

## 🚀 How to Access

When the backend application is running, you can access the documentation at:

**URL**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

> [!NOTE]
> Ensure the backend is running (via `npm run dev` or `npm run start:backend`) before attempting to access the URL.

## 🔑 Authentication & Authorization

Most endpoints in the **QA API Orchestrator** are protected by JWT (JSON Web Token) and require authorization.

### 1. Obtain a Token
1. In the Swagger UI, locate the **`auth`** section.
2. Expand the `POST /api/auth/login` endpoint.
3. Click **"Try it out"**.
4. Enter your credentials in the request body.
5. Click **"Execute"**.
6. Copy the `access_token` from the response body.

### 2. Authorize Swagger
1. Scroll to the top of the Swagger UI.
2. Click the **"Authorize"** button (green lock icon).
3. In the "Value" field, paste your token.
4. Click **"Authorize"** and then **"Close"**.
5. You can now execute requests on protected endpoints (e.g., `projects`, `requests`).

## 📂 Documentation Features

| Feature | Description |
| :--- | :--- |
| **Interactive Console** | Use "Try it out" to send real HTTP requests to your local development server. |
| **DTO Schemas** | Scroll to the **"Schemas"** section at the bottom to see model definitions for requests and responses. |
| **Response Codes** | Each endpoint documents potential status codes (200, 201, 401, etc.) and their meaning. |
| **Categorization** | Endpoints are grouped by tags: `auth`, `projects`, `requests`, `scenarios`, and `load-tests`. |

## 🛠️ Adding Documentation to New Endpoints

To add documentation to new controllers or methods, use the following decorators from `@nestjs/swagger`:

- `@ApiTags('tag-name')`: Categorize the controller.
- `@ApiOperation({ summary: 'description' })`: Describe a specific method.
- `@ApiResponse({ status: 200, description: 'success' })`: Document response types.
- `@ApiBearerAuth()`: Indicate that the endpoint requires JWT.

---
*Maintained by the infrastructure team.*
