-- CreateEnum
CREATE TYPE "public"."RoleType" AS ENUM ('USER', 'MEMBER', 'TELLER', 'LOAN_OFFICER', 'CREDIT_COMMITTEE', 'FINANCE_OFFICER', 'COMPLIANCE_OFFICER', 'BRANCH_MANAGER', 'ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('EPARGNE', 'COURANT', 'NDJANGUI', 'CHEQUE', 'PLACEMENT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "roleType" "public"."RoleType" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "nationality" TEXT,
    "resident" TEXT,
    "ppe" TEXT,
    "idNumber" TEXT,
    "idIssuer" TEXT,
    "idDate" TIMESTAMP(3),
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "profession" TEXT,
    "employer" TEXT,
    "maritalStatus" TEXT,
    "children" INTEGER,
    "salary" DECIMAL(10,2),
    "signature" TEXT,
    "termsAccepted" BOOLEAN DEFAULT false,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmergencyContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "relation" TEXT NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JointAccountInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" TEXT,
    "holder1Name" TEXT,
    "holder1Phone" TEXT,
    "holder1Niu" TEXT,
    "holder1Email" TEXT,
    "holder1Address" TEXT,
    "holder1Profession" TEXT,
    "holder1Employer" TEXT,
    "holder1IdNumber" TEXT,
    "holder1IdIssuer" TEXT,
    "holder1IdDate" TIMESTAMP(3),
    "holder2Name" TEXT,
    "holder2Phone" TEXT,
    "holder2Niu" TEXT,
    "holder2Email" TEXT,
    "holder2Address" TEXT,
    "holder2Profession" TEXT,
    "holder2Employer" TEXT,
    "holder2IdNumber" TEXT,
    "holder2IdIssuer" TEXT,
    "holder2IdDate" TIMESTAMP(3),
    "signatureType" TEXT,
    "signature1" TEXT,
    "signature2" TEXT,
    "declaration" BOOLEAN DEFAULT false,
    "terms1Accepted" BOOLEAN DEFAULT false,
    "terms2Accepted" BOOLEAN DEFAULT false,

    CONSTRAINT "JointAccountInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frontCNI" TEXT,
    "backCNI" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "public"."Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JointAccountInfo_userId_key" ON "public"."JointAccountInfo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_userId_key" ON "public"."Document"("userId");

-- AddForeignKey
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmergencyContact" ADD CONSTRAINT "EmergencyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JointAccountInfo" ADD CONSTRAINT "JointAccountInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
