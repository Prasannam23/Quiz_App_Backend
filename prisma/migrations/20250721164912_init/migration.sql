-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "answeredAt" TIMESTAMP(3),
ADD COLUMN     "questionStartedAt" TIMESTAMP(3),
ADD COLUMN     "roomId" TEXT;
