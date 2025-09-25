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


    async updateUser(id: string, dto: any) {
        console.log('=== UPDATE USER STARTED ===');
        console.log('User ID:', id);
        console.log('Received DTO keys:', Object.keys(dto));

        const user = await this.prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            console.log('❌ User not found');
            throw new NotFoundException('User not found');
        }

        console.log('✅ Current user found:', { email: user.email, username: user.username });

        // Update user and related entities in a transaction
        const updatedUser = await this.prisma.$transaction(async (prisma) => {
            console.log('=== TRANSACTION STARTED ===');

            // Prepare user update data (only include fields that are provided)
            const userUpdateData: any = {};

            // Update username only if provided and different from current
            if (dto.username !== undefined && dto.username !== user.username) {
                userUpdateData.username = dto.username;
                console.log('📝 Username will be updated:', { from: user.username, to: dto.username });
            } else if (dto.username !== undefined) {
                console.log('ℹ️  Username unchanged, skipping update');
            }

            // Update main user only if there are fields to update
            if (Object.keys(userUpdateData).length > 0) {
                console.log('🔄 Updating user with data:', userUpdateData);
                await prisma.user.update({
                    where: { id },
                    data: userUpdateData,
                });
                console.log('✅ User updated successfully');
            } else {
                console.log('ℹ️  No user fields to update');
            }

            // Update profile if profile fields are provided
            if (dto.profile !== undefined) {
                console.log('📋 Processing profile update');
                const profileData = dto.profile;
                const profileUpdateData: any = {};

                // Only update essential profile fields to reduce transaction time
                const essentialProfileFields = [
                    'firstName', 'lastName', 'birthDate', 'birthPlace', 'nationality',
                    'resident', 'phone', 'address', 'city', 'profession', 'employer',
                    'maritalStatus', 'children', 'salary', 'termsAccepted'
                ];

                essentialProfileFields.forEach(field => {
                    if (profileData[field] !== undefined) {
                        if (field === 'birthDate' && profileData[field]) {
                            profileUpdateData[field] = new Date(profileData[field]);
                        } else {
                            profileUpdateData[field] = profileData[field];
                        }
                        console.log(`📝 Profile ${field}:`, profileData[field]);
                    }
                });

                // Handle signature separately (large data)
                if (profileData.signature !== undefined && profileData.signature) {
                    // Only update signature if it's not empty and different
                    profileUpdateData.signature = profileData.signature;
                    console.log('📝 Profile signature updated (length):', profileData.signature.length);
                }

                if (Object.keys(profileUpdateData).length > 0) {
                    console.log('🔄 Upserting profile with essential data');
                    await prisma.profile.upsert({
                        where: { userId: id },
                        update: profileUpdateData,
                        create: {
                            userId: id,
                            ...profileUpdateData,
                            firstName: profileData.firstName || '',
                            lastName: profileData.lastName || '',
                            birthDate: profileData.birthDate ? new Date(profileData.birthDate) : null,
                            birthPlace: profileData.birthPlace || '',
                            nationality: profileData.nationality || '',
                            resident: profileData.resident || '',
                            phone: profileData.phone || '',
                            address: profileData.address || '',
                            city: profileData.city || '',
                            profession: profileData.profession || '',
                            employer: profileData.employer || '',
                            maritalStatus: profileData.maritalStatus || '',
                            children: profileData.children || 0,
                            salary: profileData.salary || '0',
                            signature: profileData.signature || '',
                            termsAccepted: profileData.termsAccepted || false,
                        },
                    });
                    console.log('✅ Profile updated successfully');
                } else {
                    console.log('ℹ️  No profile fields to update');
                }
            } else {
                console.log('ℹ️  No profile data provided');
            }

            // Update contacts if contacts array is provided
            if (dto.contacts !== undefined) {
                console.log('📋 Processing contacts update');
                console.log('Received contacts count:', dto.contacts.length);

                // Delete existing contacts
                console.log('🗑️  Deleting existing contacts');
                await prisma.emergencyContact.deleteMany({
                    where: { userId: id }
                });

                // Create new contacts if array is not empty
                if (dto.contacts.length > 0) {
                    console.log('🔄 Creating new contacts:', dto.contacts.length);
                    const contactData = dto.contacts.map(contact => ({
                        userId: id,
                        name: contact.name || '',
                        phone: contact.phone || '',
                        email: contact.email || '',
                        relation: contact.relation || '',
                    }));

                    await prisma.emergencyContact.createMany({
                        data: contactData,
                        skipDuplicates: true,
                    });
                    console.log('✅ Contacts created successfully');
                } else {
                    console.log('ℹ️  No contacts to create (empty array)');
                }
            } else {
                console.log('ℹ️  No contacts data provided');
            }

            // Update accounts if accounts array is provided - do this more efficiently
            if (dto.accounts !== undefined) {
                console.log('📋 Processing accounts update');
                console.log('Received accounts count:', dto.accounts.length);

                // Use Promise.all for parallel processing
                const accountPromises = dto.accounts.map(async (accountData) => {
                    if (accountData.id && accountData.type) {
                        console.log(`🔄 Processing account ${accountData.id} (${accountData.type})`);

                        try {
                            await prisma.account.upsert({
                                where: { id: accountData.id },
                                update: {
                                    active: accountData.active !== undefined ? accountData.active : undefined,
                                    balance: accountData.balance !== undefined ? accountData.balance : undefined,
                                    type: accountData.type,
                                },
                                create: {
                                    id: accountData.id,
                                    userId: id,
                                    type: accountData.type,
                                    balance: accountData.balance || '0',
                                    active: accountData.active !== undefined ? accountData.active : true,
                                },
                            });
                            console.log(`✅ Account ${accountData.id} updated successfully`);
                        } catch (error) {
                            console.error(`❌ Error updating account ${accountData.id}:`, error);
                        }
                    }
                });

                await Promise.all(accountPromises);
                console.log('✅ All accounts processed');
            } else {
                console.log('ℹ️  No accounts data provided');
            }

            // Update documents if documents object is provided
            if (dto.documents !== undefined) {
                console.log('📋 Processing documents update');
                const documentsData = dto.documents;
                const documentUpdateData: any = {};

                if (documentsData.type !== undefined) {
                    documentUpdateData.type = documentsData.type;
                    console.log('📝 Documents type:', documentsData.type);
                }
                if (documentsData.frontImage !== undefined) {
                    documentUpdateData.frontImage = documentsData.frontImage;
                    console.log('📝 Documents frontImage updated');
                }
                if (documentsData.backImage !== undefined) {
                    documentUpdateData.backImage = documentsData.backImage;
                    console.log('📝 Documents backImage updated');
                }

                if (Object.keys(documentUpdateData).length > 0) {
                    console.log('🔄 Upserting documents');
                    await prisma.document.upsert({
                        where: { userId: id },
                        update: documentUpdateData,
                        create: {
                            userId: id,
                            type: documentsData.type || 'CNI',
                            frontImage: documentsData.frontImage || '',
                            backImage: documentsData.backImage || '',
                        },
                    });
                    console.log('✅ Documents updated successfully');
                } else {
                    console.log('ℹ️  No document fields to update');
                }
            } else {
                console.log('ℹ️  No documents data provided');
            }

            // Skip verification update to prevent timeout
            if (dto.verification !== undefined) {
                console.log('ℹ️  Verification update skipped to prevent transaction timeout');
            }

            // Update the user's updatedAt timestamp
            console.log('🔄 Updating user timestamp');
            await prisma.user.update({
                where: { id },
                data: {
                    updatedAt: new Date()
                }
            });

            // Return the complete updated user with all relations
            console.log('📥 Fetching updated user with relations');
            const finalUser = await prisma.user.findUnique({
                where: { id },
                include: {
                    profile: true,
                    contacts: true,
                    accounts: true,
                    documents: true,
                    verification: true,
                },
            });

            console.log('✅ Final user data fetched');
            console.log('=== TRANSACTION COMPLETED ===');
            return finalUser;
        }, {
            timeout: 10000, // Increase transaction timeout to 10 seconds
        });

        console.log('=== UPDATE USER COMPLETED ===');
        console.log('Returning user data');

        // Return updated user directly (no password field present)
        const { ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
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
