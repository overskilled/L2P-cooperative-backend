import { Controller } from '@nestjs/common';
import { UsersVerificationService } from './users-verification.service';

@Controller('users-verification')
export class UsersVerificationController {
  constructor(private readonly usersVerificationService: UsersVerificationService) {}
}
