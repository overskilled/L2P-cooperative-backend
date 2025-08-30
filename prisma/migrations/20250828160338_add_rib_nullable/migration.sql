/*
  Warnings:

  - A unique constraint covering the columns `[rib]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "rib" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_rib_key" ON "public"."Account"("rib");
