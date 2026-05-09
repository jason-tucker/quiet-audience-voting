-- CreateTable
CREATE TABLE "TrustedDeviceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "fingerprint" TEXT,
    "userAgent" TEXT NOT NULL,
    "platform" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VoteSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVotes" INTEGER NOT NULL,
    "uniqueDevices" INTEGER NOT NULL,
    "filmResults" TEXT NOT NULL
);
