-- Add pinned field to Conversation table
-- Default to false for existing conversations

-- CreateTable
ALTER TABLE "Conversation" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
