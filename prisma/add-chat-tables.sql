-- Run in Supabase SQL Editor to add chat tables

CREATE TABLE IF NOT EXISTS "Conversation" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "outletId" TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL DEFAULT 'DIRECT',
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ConversationMember" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"(id),
  "userId" TEXT NOT NULL REFERENCES "User"(id),
  "joinedAt" TIMESTAMP DEFAULT now(),
  "lastReadAt" TIMESTAMP DEFAULT now(),
  UNIQUE("conversationId", "userId")
);

CREATE TABLE IF NOT EXISTS "Message" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"(id),
  "senderId" TEXT NOT NULL REFERENCES "User"(id),
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'TEXT',
  "orderId" TEXT REFERENCES "Order"(id),
  metadata TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS idx_msg_created ON "Message"("createdAt");
