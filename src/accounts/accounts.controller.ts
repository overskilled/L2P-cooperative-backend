// src/accounts/accounts.controller.ts
import { Controller, Post, Body, Param, Query, Get, Req, ForbiddenException, UseGuards, Request } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountType, RoleType } from '@prisma/client';
import { PaginationDto } from 'src/dto/pagination.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) { }

  @Post('open')
  @UseGuards(AuthGuard)
  async createAccount(
    @Query('type') type: AccountType,
    @Query('bankId') bankId: string,
    @Query('agencyId') agencyId: string,
    @Req() req 
  ) {

    return this.accountsService.openAccount(req.user.id, type, bankId, agencyId);
  }
  
  @Post('admin-open')
  @UseGuards(AuthGuard)
  async openUserAccount(
    @Query('type') type: AccountType,
    @Query('bankId') bankId: string,
    @Query('agencyId') agencyId: string,
    @Query('userId') userId: string,
    @Req() req
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this route');
    }
    return this.accountsService.openAccount(userId, type, bankId, agencyId);
  }

  @Post('transfer')
  @UseGuards(AuthGuard)
  async transfer(@Body() body: { fromAccountId: string; toAccountId: string; amount: number }) {
    return this.accountsService.transfer(body.fromAccountId, body.toAccountId, body.amount);
  }

  @Post('deposit')
  @UseGuards(AuthGuard)
  async deposit(
    @Query('accountId') accountId: string,
    @Query('amount') amount: number,
    @Query('phoneNumber') phoneNumber: string,
    @Query('method') method: "mtn" | "orange" ,
  ) {
    return this.accountsService.deposit(accountId, amount, phoneNumber, method);
  }

  // Check Deposit Status
  @Get('check-deposit-status')
  @UseGuards(AuthGuard)
  async getDepositStatus( @Query('transactionId') transactionId: string) {
    return this.accountsService.checkDepositStatus(transactionId);
  }
  
  // Withdraw from account
  @Post('withdraw')
  @UseGuards(AuthGuard)
  async withdraw(
    @Query('accountId') accountId: string,
    @Query('amount') amount: number,
    @Query('phoneNumber') phoneNumber: string,
    @Query('method') method: "mtn" | "orange" ,
  ) {
    return this.accountsService.withdraw(accountId, amount, phoneNumber, method);
  }
  
  @Get('check-payout-status')
  @UseGuards(AuthGuard)
  async getPayoutStatus( @Query('transactionId') transactionId: string) {
    return this.accountsService.checkPayoutStatus(transactionId);
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
