import { JwtService } from '@nestjs/jwt';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private JwtService: JwtService) { }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers.authorization;
        const token = authorization && authorization.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('Session token is missing');
        }

        try {
            const tokenPayload = await this.JwtService.verifyAsync(token);
            request.user = {
                userId: tokenPayload.sub,
                username: tokenPayload.username,
            }
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired session token');
        } 
    }
}