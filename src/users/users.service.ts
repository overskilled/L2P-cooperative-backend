import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SignupDto } from 'src/dto/signup.dto';
import { RoleType } from 'src/types/user';

import * as bcrypt from 'bcrypt';
import { PaginatedResponse, PaginationDto } from 'src/dto/pagination.dto';
import { MailerService } from 'src/mailer/mailer.service';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private mailerService: MailerService
    ) { }

    // =====================
    // USER MANAGEMENT
    // =====================


    async createUserAccount(dto: SignupDto) {
        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser) throw new ConflictException('Email already exists');

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Create user with temporary password

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                username: dto.username,
                password: hashedPassword,
                profile: {
                    create: {
                        firstName: dto.firstName,
                        lastName: dto.lastName,
                        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                        birthPlace: dto.birthPlace,
                        nationality: dto.nationality,
                        resident: dto.resident,
                        ppe: dto.ppe,
                        idNumber: dto.idNumber,
                        idIssuer: dto.idIssuer,
                        idDate: dto.idDate ? new Date(dto.idDate) : null,
                        phone: dto.phone,
                        address: dto.address,
                        city: dto.city,
                        profession: dto.profession,
                        employer: dto.employer,
                        maritalStatus: dto.maritalStatus,
                        children: dto.children,
                        salary: dto.salary,
                        signature: dto.signature,
                        termsAccepted: dto.termsAccepted,
                    },
                },
                contacts: {
                    create: [
                        dto.contact1Name
                            ? {
                                name: dto.contact1Name,
                                phone: dto.contact1Phone,
                                email: dto.contact1Email,
                                relation: dto.contact1Relation,
                            }
                            : undefined,
                        dto.contact2Name
                            ? {
                                name: dto.contact2Name,
                                phone: dto.contact2Phone,
                                email: dto.contact2Email,
                                relation: dto.contact2Relation,
                            }
                            : undefined,
                    ].filter(contact => contact !== undefined),
                },
                accounts: {
                    create: [
                        { type: 'EPARGNE', active: dto.accountEpargne ?? false },
                        { type: 'COURANT', active: dto.accountCourant ?? false },
                        { type: 'NDJANGUI', active: dto.accountNDjangui ?? false },
                        { type: 'CHEQUE', active: dto.accountCheque ?? false },
                        { type: 'PLACEMENT', active: dto.accountPlacement ?? false },
                    ],
                },
                documents: dto.frontImage || dto.backImage ? {
                    create: {
                        type: dto.type ?? 'CNI',
                        frontImage: dto.frontImage,
                        backImage: dto.backImage,
                    },
                } : undefined,
                verification: {
                    create: { status: 'PENDING' },
                },
            },
            include: { profile: true, contacts: true, accounts: true, documents: true, verification: true },
        });

        const { password, ...safeUser } = user;

        // Build reset password link
        const resetLink = `${process.env.FRONTEND_URL}/forgetPassword?email=${encodeURIComponent(user.email)}`;

        // Send email via MailerService
        await this.mailerService.sendUserCreationMail(user.email, resetLink, user.profile?.firstName!);

        return { message: 'User created successfully and password reset email sent', userId: user.id };
    }


    async getUsers(dto: PaginationDto, role?: RoleType) {
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 10;

        const skip = (page - 1) * limit;
        const take = limit;


        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: {
                    roleType: role || undefined,
                },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count({
                where: {
                    roleType: role || undefined,
                },
            }),
        ]);

        // Strip passwords safely
        const safeUsers = users.map(({ password, ...rest }) => rest);

        return new PaginatedResponse(safeUsers, total, dto);
    }

    async makeAdmin(userId: string) {
        // First, find the user
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        // Update the user's role to ADMIN
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                roleType: 'ADMIN',
            },
        });

        // Strip password before returning
        const { password, ...safeUser } = updatedUser;
        return safeUser;
    }


    async getUserById(id: string) {
        console.log("Fetching user by ID:", id);

        const user = await this.prisma.user.findUnique({
            where: { id: String(id) },
            include: {
                profile: true,
                contacts: true,
                accounts: true,
                documents: true,
                verification: true,
            },
        });

        if (!user) throw new NotFoundException("User not found");

        const { password, ...safeUser } = user;
        return safeUser;
    }


    async createUser(dto: SignupDto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        return true
    }

    async updateUser(id: string, dto: Partial<SignupDto>) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        return true
    }

    async softDeleteUser(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        // Soft delete = we keep the record but mark as deleted
        return this.prisma.user.update({
            where: { id },
            data: {
                email: `deleted_${Date.now()}_${user.email}`, // to preserve unique constraint
                username: null,
            },
        });
    }
}
