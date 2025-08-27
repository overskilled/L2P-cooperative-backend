import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PaginatedResponse, PaginationDto } from 'src/dto/pagination.dto';

interface VerificationStatus {
    PENDING: 'PENDING';
    APPROVED: 'APPROVED';
    REJECTED: 'REJECTED';
}

@Injectable()
export class UsersVerificationService {
    constructor(private prisma: PrismaService) { }

    // Get all user verifications
    async getUsersVerification(dto: PaginationDto): Promise<any> {
        const page = Number(dto.page) > 0 ? Number(dto.page) : 1;
        const limit = Number(dto.limit) > 0 ? Number(dto.limit) : 10;

        const skip = (page - 1) * limit;
        const take = limit;

        const [verifications, total] = await Promise.all([
            this.prisma.verification.findMany({
                skip,
                take,
                orderBy: { createdAt: 'desc' },
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
            }),
            this.prisma.verification.count(),
        ]);

        return new PaginatedResponse(verifications, total, dto);
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
        if (!verifiedBy) {
            throw new BadRequestException('verifiedBy is required to approve verification');
        }

        // Check if the verifier is an admin
        const verifier = await this.prisma.user.findUnique({
            where: { id: verifiedBy },
            select: { roleType: true },
        });

        if (!verifier) {
            throw new NotFoundException(`User with id ${verifiedBy} not found`);
        }

        if (verifier.roleType !== 'ADMIN') {
            throw new ForbiddenException('Only users with ADMIN role can approve verifications');
        }

        try {
            // 1. Check if verification exists
            const verification = await this.prisma.verification.findUnique({
                where: { userId },
            });

            if (!verification) {
                throw new NotFoundException(`Verification for userId ${userId} not found`);
            }

            // 2. Prevent double approval
            if (verification.status === 'APPROVED') {
                throw new BadRequestException(`User ${userId} is already approved`);
            }

            // 3. Update verification status
            return await this.prisma.verification.update({
                where: { userId },
                data: {
                    status: 'APPROVED',
                    verifiedBy,
                    verifiedAt: new Date(),
                },
            });
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundException(`Verification for userId ${userId} not found`);
            }
            throw error;
        }
    }

    // Reject a verification
    async rejectVerification(userId: string, verifiedBy: string, notes?: string) {
        if (!verifiedBy) {
            throw new BadRequestException('verifiedBy is required to reject verification');
        }

        // Check if the verifier is an admin
        const verifier = await this.prisma.user.findUnique({
            where: { id: verifiedBy },
            select: { roleType: true },
        });

        if (!verifier) {
            throw new NotFoundException(`User with id ${verifiedBy} not found`);
        }

        if (verifier.roleType !== 'ADMIN') {
            throw new ForbiddenException('Only users with ADMIN role can approve verifications');
        }

        try {
            // Fetch existing verification record
            const verification = await this.prisma.verification.findUnique({
                where: { userId },
            });

            if (!verification) {
                throw new NotFoundException(`Verification for user ${userId} not found`);
            }

            if (verification.status === 'REJECTED') {
                throw new BadRequestException(`User ${userId} has already been rejected`);
            }

            if (verification.status === 'APPROVED') {
                throw new BadRequestException(`User ${userId} has already been approved and cannot be rejected`);
            }

            // If status is PENDING (or something else), proceed with rejection
            return this.prisma.verification.update({
                where: { userId },
                data: {
                    status: 'REJECTED',
                    verifiedBy,
                    verifiedAt: new Date(),
                    notes,
                },
            });
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                throw new BadRequestException('Database error during rejection');
            }
            throw error;
        }
    }
}
