// src/accounts/accounts.controller.ts
import { Controller, Post, Body, Param, Query, Get, Req, ForbiddenException, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountType, RoleType } from '@prisma/client';
import { PaginationDto } from 'src/dto/pagination.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) { }

  @Post(':userId/create')
  @UseGuards(AuthGuard)
  async createAccount(
    @Param('userId') userId: string,
    @Body() body: { type: AccountType; bankId: string; agencyId: string },
  ) {
    return this.accountsService.openAccount(userId, body.type, body.bankId, body.agencyId);
  }

  @Post('transfer')
  @UseGuards(AuthGuard)
  async transfer(@Body() body: { fromAccountId: string; toAccountId: string; amount: number }) {
    return this.accountsService.transfer(body.fromAccountId, body.toAccountId, body.amount);
  }

  @Post(':accountId/deposit')
  @UseGuards(AuthGuard)
  async deposit(@Param('accountId') accountId: string, @Body() body: { amount: number }) {
    return this.accountsService.deposit(accountId, body.amount);
  }

  @Post(':accountId/withdraw')
  @UseGuards(AuthGuard)
  async withdraw(@Param('accountId') accountId: string, @Body() body: { amount: number }) {
    return this.accountsService.withdraw(accountId, body.amount);
  }


  /**
   * Get accounts for current user
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMyAccounts(@Req() req, @Query() dto: PaginationDto) {
    return this.accountsService.getUserAccounts(req.user.id, dto);
  }

  /**
   * Get accounts by userId (ADMIN or account owner)
   */
  @Get('user/:userId')
  @UseGuards(AuthGuard)
  async getUserAccounts(
    @Param('userId') userId: string,
    @Req() req,
    @Query() dto: PaginationDto,
  ) {
    if (req.user.role === RoleType.ADMIN || req.user.id === userId) {
      return this.accountsService.getUserAccounts(userId, dto);
    }
    throw new Error('Forbidden');
  }

  
  /**
   * Get all accounts grouped by users (ADMIN only)
   */
  @Get('grouped')
  @UseGuards(AuthGuard)
  async getGroupedAccounts(@Query() dto: PaginationDto, @Req() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this route');
    }
    return this.accountsService.getAccountsGroupedByUsers(dto, req.user.role);
  }

  /**
   * Get all active accounts (ADMIN only)
   */
  @Get('active')
  @UseGuards(AuthGuard)
  async getActiveAccounts(@Query() dto: PaginationDto, @Req() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this route');
    }
    return this.accountsService.getActiveAccounts(dto, req.user.role);
  }

  /**
   * Get accounts by type + status
   * - Admin: all users
   * - User: only their own
   */
  @Get('filter')
  @UseGuards(AuthGuard)
  async getAccountsByTypeAndStatus(
    @Query() dto: PaginationDto,
    @Query('type') type: string,
    @Query('isActive') isActive: string,
    @Query('userId') userId: string,
    @Req() req,
  ) {
    const filters = {
      userId,
      type,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    };

    return this.accountsService.getAccountsByTypeAndStatus(
      dto,
      req.user.role,
      filters,
    );
  }
}
