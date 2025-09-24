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
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?email=${encodeURIComponent(user.email)}`;

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
                include: {
                    profile: true,
                    contacts: true,
                    accounts: true,
                    documents: true,
                    verification: true,
                },
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


    async updateUser(id: string, dto: Partial<SignupDto>) {
        const user = await this.prisma.user.findUnique({
            where: { id }
        });

        if (!user) throw new NotFoundException('User not found');

        // Update user and related entities in a transaction
        const updatedUser = await this.prisma.$transaction(async (prisma) => {
            // Prepare user update data (only include fields that are provided)
            const userUpdateData: any = {};
            if (dto.email !== undefined) userUpdateData.email = dto.email;
            if (dto.username !== undefined) userUpdateData.username = dto.username;

            // Update main user only if there are fields to update
            if (Object.keys(userUpdateData).length > 0) {
                await prisma.user.update({
                    where: { id },
                    data: userUpdateData,
                });
            }

            // Update profile only if profile fields are provided
            if (dto.firstName !== undefined || dto.lastName !== undefined || dto.birthDate !== undefined ||
                dto.birthPlace !== undefined || dto.nationality !== undefined || dto.resident !== undefined ||
                dto.ppe !== undefined || dto.idNumber !== undefined || dto.idIssuer !== undefined ||
                dto.idDate !== undefined || dto.phone !== undefined || dto.address !== undefined ||
                dto.city !== undefined || dto.profession !== undefined || dto.employer !== undefined ||
                dto.maritalStatus !== undefined || dto.children !== undefined || dto.salary !== undefined ||
                dto.signature !== undefined || dto.termsAccepted !== undefined) {

                const profileUpdateData: any = {};

                // Only add fields that are explicitly provided
                if (dto.firstName !== undefined) profileUpdateData.firstName = dto.firstName;
                if (dto.lastName !== undefined) profileUpdateData.lastName = dto.lastName;
                if (dto.birthDate !== undefined) profileUpdateData.birthDate = dto.birthDate ? new Date(dto.birthDate) : null;
                if (dto.birthPlace !== undefined) profileUpdateData.birthPlace = dto.birthPlace;
                if (dto.nationality !== undefined) profileUpdateData.nationality = dto.nationality;
                if (dto.resident !== undefined) profileUpdateData.resident = dto.resident;
                if (dto.ppe !== undefined) profileUpdateData.ppe = dto.ppe;
                if (dto.idNumber !== undefined) profileUpdateData.idNumber = dto.idNumber;
                if (dto.idIssuer !== undefined) profileUpdateData.idIssuer = dto.idIssuer;
                if (dto.idDate !== undefined) profileUpdateData.idDate = dto.idDate ? new Date(dto.idDate) : null;
                if (dto.phone !== undefined) profileUpdateData.phone = dto.phone;
                if (dto.address !== undefined) profileUpdateData.address = dto.address;
                if (dto.city !== undefined) profileUpdateData.city = dto.city;
                if (dto.profession !== undefined) profileUpdateData.profession = dto.profession;
                if (dto.employer !== undefined) profileUpdateData.employer = dto.employer;
                if (dto.maritalStatus !== undefined) profileUpdateData.maritalStatus = dto.maritalStatus;
                if (dto.children !== undefined) profileUpdateData.children = dto.children;
                if (dto.salary !== undefined) profileUpdateData.salary = dto.salary;
                if (dto.signature !== undefined) profileUpdateData.signature = dto.signature;
                if (dto.termsAccepted !== undefined) profileUpdateData.termsAccepted = dto.termsAccepted;

                await prisma.profile.upsert({
                    where: { userId: id },
                    update: profileUpdateData,
                    create: {
                        userId: id,
                        firstName: dto.firstName || '',
                        lastName: dto.lastName || '',
                        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                        birthPlace: dto.birthPlace || '',
                        nationality: dto.nationality || '',
                        resident: dto.resident || '',
                        ppe: dto.ppe || '',
                        idNumber: dto.idNumber || '',
                        idIssuer: dto.idIssuer || '',
                        idDate: dto.idDate ? new Date(dto.idDate) : null,
                        phone: dto.phone || '',
                        address: dto.address || '',
                        city: dto.city || '',
                        profession: dto.profession || '',
                        employer: dto.employer || '',
                        maritalStatus: dto.maritalStatus || '',
                        children: dto.children || 0,
                        salary: dto.salary || '0',
                        signature: dto.signature || '',
                        termsAccepted: dto.termsAccepted || false,
                    },
                });
            }

            // Update contacts only if contact fields are provided
            if (dto.contact1Name !== undefined || dto.contact2Name !== undefined) {
                // Get existing contacts to understand current state
                const existingContacts = await prisma.emergencyContact.findMany({
                    where: { userId: id }
                });

                const contactsToUpdate: any[] = [];

                // Handle contact 1 updates
                if (dto.contact1Name !== undefined) {
                    const contact1Data: any = { name: dto.contact1Name };
                    if (dto.contact1Phone !== undefined) contact1Data.phone = dto.contact1Phone;
                    if (dto.contact1Email !== undefined) contact1Data.email = dto.contact1Email;
                    if (dto.contact1Relation !== undefined) contact1Data.relation = dto.contact1Relation;

                    contactsToUpdate.push(contact1Data);
                }

                // Handle contact 2 updates
                if (dto.contact2Name !== undefined) {
                    const contact2Data: any = { name: dto.contact2Name };
                    if (dto.contact2Phone !== undefined) contact2Data.phone = dto.contact2Phone;
                    if (dto.contact2Email !== undefined) contact2Data.email = dto.contact2Email;
                    if (dto.contact2Relation !== undefined) contact2Data.relation = dto.contact2Relation;

                    contactsToUpdate.push(contact2Data);
                }

                // Delete existing contacts and recreate with updated data
                await prisma.emergencyContact.deleteMany({ where: { userId: id } });

                if (contactsToUpdate.length > 0) {
                    await prisma.emergencyContact.createMany({
                        data: contactsToUpdate.map(contact => ({
                            ...contact,
                            userId: id,
                        })),
                    });
                }
            }

            // Update accounts only if account fields are provided
            if (dto.accountEpargne !== undefined || dto.accountCourant !== undefined ||
                dto.accountNDjangui !== undefined || dto.accountCheque !== undefined ||
                dto.accountPlacement !== undefined) {

                // Get existing accounts for this user
                const existingAccounts = await prisma.account.findMany({
                    where: { userId: id }
                });

                const accountUpdates: Promise<any>[] = [];

                // Handle each account type
                const accountTypes = [
                    { type: 'EPARGNE' as const, active: dto.accountEpargne },
                    { type: 'COURANT' as const, active: dto.accountCourant },
                    { type: 'NDJANGUI' as const, active: dto.accountNDjangui },
                    { type: 'CHEQUE' as const, active: dto.accountCheque },
                    { type: 'PLACEMENT' as const, active: dto.accountPlacement },
                ];

                for (const accountType of accountTypes) {
                    if (accountType.active !== undefined) {
                        const existingAccount = existingAccounts.find(acc => acc.type === accountType.type);

                        if (existingAccount) {
                            // Update existing account
                            accountUpdates.push(
                                prisma.account.update({
                                    where: { id: existingAccount.id },
                                    data: { active: accountType.active }
                                })
                            );
                        } else {
                            // Create new account if it doesn't exist
                            accountUpdates.push(
                                prisma.account.create({
                                    data: {
                                        userId: id,
                                        type: accountType.type,
                                        active: accountType.active,
                                        balance: 0
                                    }
                                })
                            );
                        }
                    }
                }

                if (accountUpdates.length > 0) {
                    await Promise.all(accountUpdates);
                }
            }

            // Update documents only if document fields are provided
            if (dto.frontImage !== undefined || dto.backImage !== undefined || dto.type !== undefined) {
                const documentUpdateData: any = {};
                if (dto.type !== undefined) documentUpdateData.type = dto.type;
                if (dto.frontImage !== undefined) documentUpdateData.frontImage = dto.frontImage;
                if (dto.backImage !== undefined) documentUpdateData.backImage = dto.backImage;

                await prisma.document.upsert({
                    where: { userId: id },
                    update: documentUpdateData,
                    create: {
                        userId: id,
                        type: dto.type || 'CNI',
                        frontImage: dto.frontImage || '',
                        backImage: dto.backImage || '',
                    },
                });
            }

            // Return the complete updated user with all relations
            return await prisma.user.findUnique({
                where: { id },
                include: {
                    profile: true,
                    contacts: true,
                    accounts: true,
                    documents: true,
                    verification: true,
                },
            });
        });

        // Return updated user directly (no password field present)
        return updatedUser;
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
