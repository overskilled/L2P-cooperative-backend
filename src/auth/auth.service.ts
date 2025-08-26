import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignupDto } from 'src/dto/signup.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';

type AuthInput = {
    username: string
    password: string
}

type signInData = {
    userId: string
    username: string
}

type AuthResult = {
    accessToken: string
    userId: string
    username: string
}

type Contact = {
    name: string
    phone: string | null
    email: string | null
    relation: string | null
}

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private prismaService: PrismaService
    ) { }

    async validateUser(input: AuthInput): Promise<signInData | null> {
        // Try to find user by username or email
        const user = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { username: input.username },
                    { email: input.username }
                ]
            }
        });

        if (!user) return null;

        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(input.password, user.password);
        if (!isPasswordValid) return null;

        return {
            userId: user.id,        // assuming 'id' is PK in Prisma
            username: user.username ?? user.email, // fallback to email if username missing
        };
    }

    async authenticate(input: AuthInput): Promise<AuthResult> {
        const user = await this.validateUser(input);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.signIn(user);
    }

    async signIn(user: signInData): Promise<AuthResult> {
        const tokenPayload = {
            sub: user.userId,
            username: user.username,
        };

        const accessToken = await this.jwtService.signAsync(tokenPayload);

        return {
            accessToken,
            userId: user.userId,
            username: user.username,
        };
    }


    async signup(dto: SignupDto) {
        const existingUser = await this.prismaService.user.findUnique({ where: { email: dto.email } });
        if (existingUser) throw new ConflictException('Email already exists');

        if (dto.username) {
            const existingUsername = await this.prismaService.user.findUnique({ where: { username: dto.username } });
            if (existingUsername) throw new ConflictException('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prismaService.user.create({
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
                documents: dto.frontCNI || dto.backCNI ? {
                    create: {
                        frontCNI: dto.frontCNI,
                        backCNI: dto.backCNI,
                    },
                } : undefined,
                verification: {
                    create: { status: 'PENDING' }, 
                },
            },
            include: { profile: true, contacts: true, accounts: true, documents: true },
        });

        const { password, ...safeUser } = user;

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            username: user.username ?? user.email,
        });

        return { accessToken, userId: user.id, username: user.username ?? user.email, user: safeUser };
    }
}
