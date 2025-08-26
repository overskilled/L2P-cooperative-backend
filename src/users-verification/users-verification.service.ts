import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

interface VerificationStatus {
    PENDING: 'PENDING';
    APPROVED: 'APPROVED';
    REJECTED: 'REJECTED';
}

@Injectable()
export class UsersVerificationService {
    constructor(private prisma: PrismaService) { }

    // Get all user verifications
    async getUsersVerification() {
        return this.prisma.verification.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        roleType: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // Get verification by userId
    async getVerificationByUserId(userId: string) {
        const verification = await this.prisma.verification.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { id: true, email: true, username: true, roleType: true },
                },
            },
        });

        if (!verification) {
            throw new NotFoundException(`Verification for user ${userId} not found`);
        }

        return verification;
    }

    // Approve a verification
    async approveVerification(userId: string, verifiedBy: string) {
        return this.prisma.verification.update({
            where: { userId },
            data: {
                status: "APPROVED",
                verifiedBy,
                verifiedAt: new Date(),
            },
        });
    }

    // Reject a verification
    async rejectVerification(userId: string, verifiedBy: string, notes?: string) {
        return this.prisma.verification.update({
            where: { userId },
            data: {
                status: "REJECTED",
                verifiedBy,
                verifiedAt: new Date(),
                notes,
            },
        });
    }
}
