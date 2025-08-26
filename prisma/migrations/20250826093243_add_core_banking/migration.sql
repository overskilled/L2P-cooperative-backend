-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'FEE', 'INTEREST');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."Account" ADD COLUMN     "balance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "active" SET DEFAULT true;

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
