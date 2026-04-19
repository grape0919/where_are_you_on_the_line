-- AlterTable
ALTER TABLE "queues" ADD COLUMN     "patientId" INTEGER;

-- CreateIndex
CREATE INDEX "queues_patientId_idx" ON "queues"("patientId");

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
