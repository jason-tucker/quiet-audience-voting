-- CreateTable
CREATE TABLE "Film" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filmId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceFingerprint" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "timezone" TEXT,
    "language" TEXT,
    "platform" TEXT,
    "colorDepth" INTEGER,
    "touchSupport" BOOLEAN,
    "pixelRatio" REAL,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "cookieEnabled" BOOLEAN,
    "doNotTrack" TEXT,
    "hardwareConcurrency" INTEGER,
    "deviceMemory" REAL,
    "rawDeviceJson" TEXT NOT NULL,
    CONSTRAINT "Vote_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Film_displayOrder_idx" ON "Film"("displayOrder");

-- CreateIndex
CREATE INDEX "Vote_filmId_idx" ON "Vote"("filmId");

-- CreateIndex
CREATE INDEX "Vote_timestamp_idx" ON "Vote"("timestamp");

-- CreateIndex
CREATE INDEX "Vote_deviceFingerprint_idx" ON "Vote"("deviceFingerprint");
