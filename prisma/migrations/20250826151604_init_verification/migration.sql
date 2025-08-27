/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Verification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."JointAccountInfo" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'INACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "Verification_userId_key" ON "public"."Verification"("userId");
