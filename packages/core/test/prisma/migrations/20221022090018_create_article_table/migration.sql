-- CreateTable
CREATE TABLE "Article" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "publication" TEXT NOT NULL,
    "readingTime" INTEGER NOT NULL,
    "claps" INTEGER NOT NULL
);
