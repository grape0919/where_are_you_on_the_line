-- CreateTable
CREATE TABLE "queues" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "treatmentItems" TEXT[],
    "totalEstimatedMinutes" INTEGER NOT NULL,
    "doctor" TEXT,
    "room" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "estimatedWaitTime" INTEGER NOT NULL DEFAULT 0,
    "queuePosition" INTEGER NOT NULL DEFAULT 0,
    "patientsAhead" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" BIGINT,
    "inProgressAt" BIGINT,
    "completedAt" BIGINT,
    "cancelledAt" BIGINT,
    "cancelReason" TEXT,
    "createdAt" BIGINT NOT NULL,
    "updatedAt" BIGINT NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "queues_token_key" ON "queues"("token");

-- CreateIndex
CREATE INDEX "queues_status_idx" ON "queues"("status");

-- CreateIndex
CREATE INDEX "queues_doctor_status_idx" ON "queues"("doctor", "status");

-- CreateIndex
CREATE INDEX "queues_createdAt_idx" ON "queues"("createdAt");

-- CreateIndex
CREATE INDEX "queues_status_createdAt_idx" ON "queues"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");
