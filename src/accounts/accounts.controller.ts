// src/accounts/accounts.controller.ts
import { Controller, Post, Body, Param, Query, Get, Req, ForbiddenException, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountType, RoleType } from '@prisma/client';
import { PaginationDto } from 'src/dto/pagination.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';

@Controller('accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) { }


  @Get('my-balance')
  @UseGuards(AuthGuard)
  async getMyTransactions(@Req() req) {
    return this.accountsService.getUserTotalBalance(req.user.id);
  }

  @Get('available-funds')
  @UseGuards(AuthGuard)
  async getAvailableFunds(@Req() req) {
    return this.accountsService.getAvailableFunds(req.user.id);
  }

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
    @Query('method') method: "mtn" | "orange",
  ) {
    return this.accountsService.deposit(accountId, amount, phoneNumber, method);
  }

  // Check Deposit Status
  @Get('check-deposit-status')
  @UseGuards(AuthGuard)
  async getDepositStatus(@Query('transactionId') transactionId: string) {
    return this.accountsService.checkDepositStatus(transactionId);
  }

  // Withdraw from account
  @Post('withdraw')
  @UseGuards(AuthGuard)
  async withdraw(
    @Query('accountId') accountId: string,
    @Query('amount') amount: number,
    @Query('phoneNumber') phoneNumber: string,
    @Query('method') method: "mtn" | "orange",
  ) {
    return this.accountsService.withdraw(accountId, amount, phoneNumber, method);
  }

  @Get('check-payout-status')
  @UseGuards(AuthGuard)
  async getPayoutStatus(@Query('transactionId') transactionId: string) {
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


  // ===============================
  // USER FINANCIAL ENDPOINTS
  // ===============================

  /**
   * Get total income (deposits) for a user
   */
  @Get('users/:userId/income')
  @UseGuards(AuthGuard)
  async getUserIncome(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Validate date parameters
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return this.accountsService.getTotalIncome(req.user.id, start, end);
  }

  /**
   * Get total expenses (transfers + withdrawals) for a user
   */
  @Get('users/:userId/expenses')
  @UseGuards(AuthGuard)
  async getUserExpenses(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Validate date parameters
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return this.accountsService.getTotalExpenses(req.user.id, start, end);
  }

  /**
   * Get comprehensive financial summary for a user
   */
  @Get('users/:userId/financial-summary')
  @UseGuards(AuthGuard)
  async getFinancialSummary(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Validate date parameters
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return this.accountsService.getFinancialSummary(req.user.id, start, end);
  }

  /**
   * Get transaction breakdown by type for a user
   */
  @Get('users/:userId/transaction-breakdown')
  async getTransactionBreakdown(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Validate date parameters
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return this.accountsService.getTransactionBreakdown(req.user.id, start, end);
  }

  /**
   * Get monthly financial data for charts
   */
  // @Get('users/:userId/monthly-financial-data')
  // @UseGuards(AuthGuard)
  // async getMonthlyFinancialData(
  //   @Req() req,
  //   @Query('months', new DefaultValuePipe(12), ParseIntPipe) months: number,
  // ) {
  //   if (months < 1 || months > 60) {
  //     throw new BadRequestException('Months must be between 1 and 60');
  //   }

  //   return this.accountsService.getMonthlyFinancialData(req.user.id, months);
  // }

  /**
   * Get current user's financial data (using token)
   */
  @Get('me/financial-summary')
  async getMyFinancialSummary(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return this.accountsService.getFinancialSummary(req.user.id, start, end);
  }

  /**
   * Get current user's income
   */
  @Get('me/income')
  async getMyIncome(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return this.accountsService.getTotalIncome(req.user.id, start, end);
  }

  /**
   * Get current user's expenses
   */
  @Get('me/expenses')
  async getMyExpenses(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? this.parseDate(startDate) : undefined;
    const end = endDate ? this.parseDate(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    return this.accountsService.getTotalExpenses(req.user.id, start, end);
  }

  // ===============================
  // ADMIN FINANCIAL ENDPOINTS
  // ===============================

  /**
   * Get platform-wide financial overview (Admin only)
   */
  // @Get('admin/financial-overview')
  // @Roles(RoleType.ADMIN)
  // async getPlatformFinancialOverview(
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  // ) {
  //   const start = startDate ? this.parseDate(startDate) : undefined;
  //   const end = endDate ? this.parseDate(endDate) : undefined;

  //   if (start && end && start > end) {
  //     throw new BadRequestException('Start date cannot be after end date');
  //   }

  //   return this.accountsService.getPlatformFinancialOverview(start, end);
  // }

  // /**
  //  * Get financial summary for any user (Admin only)
  //  */
  // @Get('admin/users/:userId/financial-summary')
  // @Roles(RoleType.ADMIN)
  // async getAdminUserFinancialSummary(
  //   @Param('userId', ParseUUIDPipe) userId: string,
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  // ) {
  //   const start = startDate ? this.parseDate(startDate) : undefined;
  //   const end = endDate ? this.parseDate(endDate) : undefined;

  //   if (start && end && start > end) {
  //     throw new BadRequestException('Start date cannot be after end date');
  //   }

  //   return this.accountsService.getFinancialSummary(userId, start, end);
  // }

  // /**
  //  * Get transaction breakdown for any user (Admin only)
  //  */
  // @Get('admin/users/:userId/transaction-breakdown')
  // @Roles(RoleType.ADMIN)
  // async getAdminUserTransactionBreakdown(
  //   @Param('userId', ParseUUIDPipe) userId: string,
  //   @Query('startDate') startDate?: string,
  //   @Query('endDate') endDate?: string,
  // ) {
  //   const start = startDate ? this.parseDate(startDate) : undefined;
  //   const end = endDate ? this.parseDate(endDate) : undefined;

  //   if (start && end && start > end) {
  //     throw new BadRequestException('Start date cannot be after end date');
  //   }

  //   return this.accountsService.getTransactionBreakdown(userId, start, end);
  // }

  // // ===============================
  // // EXISTING ACCOUNT ENDPOINTS (for completeness)
  // // ===============================

  // @Get('users/:userId/accounts')
  // async getUserAccounts(
  //   @Param('userId', ParseUUIDPipe) userId: string,
  //   @Query() paginationDto: PaginationDto,
  // ) {
  //   return this.accountsService.getUserAccounts(userId, paginationDto);
  // }

  // @Get('users/:userId/total-balance')
  // async getUserTotalBalance(@Param('userId', ParseUUIDPipe) userId: string) {
  //   return this.accountsService.getUserTotalBalance(userId);
  // }

  // @Get('users/:userId/available-funds')
  // async getAvailableFunds(@Param('userId', ParseUUIDPipe) userId: string) {
  //   return this.accountsService.getAvailableFunds(userId);
  // }

  // @Get('admin/accounts-grouped')
  // @Roles(RoleType.ADMIN)
  // async getAccountsGroupedByUsers(@Query() paginationDto: PaginationDto) {
  //   // You might need to pass the role from the user, adjust as needed
  //   return this.accountsService.getAccountsGroupedByUsers(paginationDto, RoleType.ADMIN);
  // }



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

  /**
 * Parse date string to Date object with validation
 */
  private parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date format: ${dateString}. Use ISO format (YYYY-MM-DD).`);
    }
    return date;
  }
}
