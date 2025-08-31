import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UsersVerificationService } from './users-verification.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApiQuery } from '@nestjs/swagger';
import { PaginationDto } from 'src/dto/pagination.dto';

@Controller('users-verification')
export class UsersVerificationController {
  constructor(private readonly verificationService: UsersVerificationService) { }

  @Get()
  @UseGuards(AuthGuard)
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getAll(
    @Query() pagination: PaginationDto = { page: 1, limit: 10 },
  ) {
    return this.verificationService.getUsersVerification(pagination);
  }

  @Get(':userId')
  @UseGuards(AuthGuard)
  getByUser(@Param('userId') userId: string) {
    return this.verificationService.getVerificationByUserId(userId);
  }

  @Patch(':userId/approve')
  @UseGuards(AuthGuard)
  approve(
    @Param('userId') userId: string,
    @Query('verifiedBy') verifiedBy: string
  ) {
    return this.verificationService.approveVerification(userId, verifiedBy);
  }

  @Patch(':userId/reject')
  @UseGuards(AuthGuard)
  reject(
    @Param('userId') userId: string,
    @Query('verifiedBy') verifiedBy: string,
    @Body() body: { notes?: string },
  ) {
    return this.verificationService.rejectVerification(userId, verifiedBy, body.notes);
  }
}
