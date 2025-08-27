/*
  Warnings:

  - You are about to drop the column `backCNI` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `frontCNI` on the `Document` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CNI', 'PASSPORT');

-- AlterTable
ALTER TABLE "public"."Document" DROP COLUMN "backCNI",
DROP COLUMN "frontCNI",
ADD COLUMN     "backImage" TEXT,
ADD COLUMN     "frontImage" TEXT,
ADD COLUMN     "type" "public"."DocumentType" NOT NULL DEFAULT 'CNI';
