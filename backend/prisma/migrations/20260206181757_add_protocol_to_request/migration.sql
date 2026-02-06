-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LoadExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadTestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "results" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoadExecution_loadTestId_fkey" FOREIGN KEY ("loadTestId") REFERENCES "LoadTest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LoadExecution" ("createdAt", "duration", "id", "loadTestId", "results", "status") SELECT "createdAt", "duration", "id", "loadTestId", "results", "status" FROM "LoadExecution";
DROP TABLE "LoadExecution";
ALTER TABLE "new_LoadExecution" RENAME TO "LoadExecution";
CREATE TABLE "new_Request" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "method" TEXT NOT NULL,
    "protocol" TEXT NOT NULL DEFAULT 'REST',
    "url" TEXT NOT NULL,
    "headers" JSONB,
    "body" JSONB,
    "testScript" TEXT,
    "projectId" TEXT NOT NULL,
    "expectedResponseSchema" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Request_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Request" ("body", "createdAt", "expectedResponseSchema", "headers", "id", "method", "name", "projectId", "testScript", "updatedAt", "url") SELECT "body", "createdAt", "expectedResponseSchema", "headers", "id", "method", "name", "projectId", "testScript", "updatedAt", "url" FROM "Request";
DROP TABLE "Request";
ALTER TABLE "new_Request" RENAME TO "Request";
CREATE TABLE "new_RequestExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "environmentId" TEXT,
    "response" JSONB,
    "status" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "validationResult" JSONB,
    "testResults" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequestExecution_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequestExecution_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RequestExecution" ("createdAt", "duration", "environmentId", "id", "requestId", "response", "status", "testResults", "validationResult") SELECT "createdAt", "duration", "environmentId", "id", "requestId", "response", "status", "testResults", "validationResult" FROM "RequestExecution";
DROP TABLE "RequestExecution";
ALTER TABLE "new_RequestExecution" RENAME TO "RequestExecution";
CREATE TABLE "new_WebExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "environmentId" TEXT,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "logs" JSONB,
    "screenshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebExecution_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "WebScenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WebExecution_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WebExecution" ("createdAt", "duration", "environmentId", "id", "logs", "scenarioId", "screenshot", "status") SELECT "createdAt", "duration", "environmentId", "id", "logs", "scenarioId", "screenshot", "status" FROM "WebExecution";
DROP TABLE "WebExecution";
ALTER TABLE "new_WebExecution" RENAME TO "WebExecution";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
