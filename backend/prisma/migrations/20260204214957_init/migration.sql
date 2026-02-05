-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WebExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "environmentId" TEXT,
    "status" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "logs" JSONB,
    "screenshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebExecution_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "WebScenario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WebExecution_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WebExecution" ("createdAt", "duration", "id", "logs", "scenarioId", "screenshot", "status") SELECT "createdAt", "duration", "id", "logs", "scenarioId", "screenshot", "status" FROM "WebExecution";
DROP TABLE "WebExecution";
ALTER TABLE "new_WebExecution" RENAME TO "WebExecution";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
