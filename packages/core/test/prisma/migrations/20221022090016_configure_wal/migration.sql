-- Enabling WAL is important to avoid locking and to speed up queries
PRAGMA journal_mode=WAL;