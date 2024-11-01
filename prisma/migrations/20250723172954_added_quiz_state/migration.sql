-- CreateEnum
CREATE TYPE "State" AS ENUM ('yet_to_start', 'ongoing', 'completed');

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "state" "State";
