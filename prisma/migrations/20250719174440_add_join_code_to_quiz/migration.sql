/*
  Warnings:

  - A unique constraint covering the columns `[joinCode]` on the table `Quiz` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `joinCode` to the `Quiz` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "joinCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_joinCode_key" ON "Quiz"("joinCode");
