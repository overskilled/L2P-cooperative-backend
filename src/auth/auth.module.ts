import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategies';
import { JwtStrategy } from './strategies/jwt.strategies';
import { Prisma } from '@prisma/client';
import { PrismaModule } from 'prisma/prisma.module';
import { MailerModule } from 'src/mailer/mailer.module';


@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || "defaultSecret",
      signOptions: {
        expiresIn: '1d',
      },
    }),
    PassportModule,
    PrismaModule,
    MailerModule
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
})
export class AuthModule { }
