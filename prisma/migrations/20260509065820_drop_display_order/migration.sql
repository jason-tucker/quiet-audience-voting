/*
  Warnings:

  - You are about to drop the column `displayOrder` on the `Film` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Film" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Film" ("createdAt", "id", "name", "posterUrl", "school") SELECT "createdAt", "id", "name", "posterUrl", "school" FROM "Film";
DROP TABLE "Film";
ALTER TABLE "new_Film" RENAME TO "Film";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
