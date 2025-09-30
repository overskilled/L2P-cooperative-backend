import { Module } from '@nestjs/common';
import { UsersVerificationService } from './users-verification.service';
import { UsersVerificationController } from './users-verification.controller';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [MailerModule],
  controllers: [UsersVerificationController],
  providers: [UsersVerificationService],
})
export class UsersVerificationModule {}
