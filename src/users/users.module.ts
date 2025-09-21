import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MailerService } from 'src/mailer/mailer.service';
import { MailerModule } from 'src/mailer/mailer.module';

@Module({
  imports: [
    MailerModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
