-- Create FTS5 virtual table for full-text search on Chunk.text
-- This enables fast BM25-based prefiltering before cosine similarity

CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(
  text,
  chunkId UNINDEXED,
  documentId UNINDEXED,
  content='Chunk',
  content_rowid='id'
);

-- Seed FTS5 table with existing chunks
INSERT INTO chunk_fts(rowid, text, chunkId, documentId)
  SELECT c.id, c.text, c.id, c.documentId FROM Chunk c;

-- Trigger: Keep FTS5 in sync on INSERT
CREATE TRIGGER IF NOT EXISTS chunk_ai AFTER INSERT ON Chunk BEGIN
  INSERT INTO chunk_fts(rowid, text, chunkId, documentId)
    VALUES (new.id, new.text, new.id, new.documentId);
END;

-- Trigger: Keep FTS5 in sync on DELETE
CREATE TRIGGER IF NOT EXISTS chunk_ad AFTER DELETE ON Chunk BEGIN
  DELETE FROM chunk_fts WHERE rowid = old.id;
END;

-- Trigger: Keep FTS5 in sync on UPDATE
CREATE TRIGGER IF NOT EXISTS chunk_au AFTER UPDATE ON Chunk BEGIN
  UPDATE chunk_fts SET text = new.text WHERE rowid = old.id;
END;
