-- CreateTable
CREATE TABLE "AuthEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reason" TEXT
);

-- CreateIndex
CREATE INDEX "AuthEvent_timestamp_idx" ON "AuthEvent"("timestamp");

-- CreateIndex
CREATE INDEX "AuthEvent_outcome_idx" ON "AuthEvent"("outcome");
