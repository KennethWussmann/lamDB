/*
  Warnings:

  - You are about to drop the column `responses` on the `Article` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "publication" TEXT NOT NULL,
    "readingTime" INTEGER,
    "claps" INTEGER
);
INSERT INTO "new_Article" ("claps", "id", "publication", "readingTime", "subtitle", "title", "url") SELECT "claps", "id", "publication", "readingTime", "subtitle", "title", "url" FROM "Article";
DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
