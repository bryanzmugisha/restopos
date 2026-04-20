-- Add new columns to Outlet (safe - skip if exists)
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "modules" TEXT;
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'BASIC';
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "maxStaff" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "maxOrders" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "isHealthy" BOOLEAN NOT NULL DEFAULT true;

-- Create SystemLog table
CREATE TABLE IF NOT EXISTS "SystemLog" (
    "id" TEXT NOT NULL,
    "outletId" TEXT,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SystemLog_outletId_idx" ON "SystemLog"("outletId");
CREATE INDEX IF NOT EXISTS "SystemLog_level_idx" ON "SystemLog"("level");
CREATE INDEX IF NOT EXISTS "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");
