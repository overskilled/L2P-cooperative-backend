import { Module } from '@nestjs/common';
import { UsersVerificationService } from './users-verification.service';
import { UsersVerificationController } from './users-verification.controller';

@Module({
  controllers: [UsersVerificationController],
  providers: [UsersVerificationService],
})
export class UsersVerificationModule {}
