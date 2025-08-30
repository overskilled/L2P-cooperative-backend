import { JwtService } from '@nestjs/jwt';
import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private prisma: PrismaService
    ) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers.authorization;
        const token = authorization && authorization.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('Session token is missing');
        }


        try {
            // Verify token
            const tokenPayload = await this.jwtService.verifyAsync(token);

            // Fetch user with role
            const dbUser = await this.prisma.user.findUnique({
                where: { id: String(tokenPayload.sub) },
                include: {
                    profile: true,
                    contacts: true,
                    accounts: true,
                    documents: true,
                    verification: true,
                },
            });

            if (!dbUser) {
                throw new NotFoundException("User not found");
            }

            const { password, ...safeUser } = dbUser;

            request.user = {
                ...safeUser,
                id: dbUser.id,
                username: dbUser.username ?? dbUser.email,
                role: dbUser.roleType, 
            };

            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired session token');
        }
    }
}