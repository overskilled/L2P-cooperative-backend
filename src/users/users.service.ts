import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SignupDto } from 'src/dto/signup.dto';
import { RoleType } from 'src/types/user';

import * as bcrypt from 'bcrypt';
import { PaginatedResponse, PaginationDto } from 'src/dto/pagination.dto';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    // =====================
    // USER MANAGEMENT
    // =====================

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
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException('User not found');

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
