// src/transactions/transactions.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, ConfirmTransactionDto } from './dto/transaction.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { PaginationDto } from 'src/dto/pagination.dto';

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  /**
   * Get all transactions (ADMIN only)
   */
  @Get()
  async getAllTransactions(@Query() dto: PaginationDto, @Req() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can access this route');
    }
    return this.transactionsService.getAllTransactions(dto);
  }


  /**
   * Get transactions for current user
   */
  @Get('my-transactions')
  async getMyTransactions(@Req() req, @Query() dto: PaginationDto) {
    return this.transactionsService.getTransactionsByUser(req.user.id, dto);
  }


  /**
   * Get transactions by account ID
   * - Admin: any account
   * - User: only their own accounts
   */
  @Get('account/:accountId')
  async getTransactionsByAccount(
    @Param('accountId') accountId: string,
    @Query() dto: PaginationDto,
    @Req() req
  ) {
    return this.transactionsService.getTransactionsByAccount(accountId, dto, req.user);
  }
  

  /**
   * Get transaction by ID
   * - Admin: any transaction
   * - User: only their own transactions
   */
  @Get(':id')
  async getTransactionById(@Param('id') id: string, @Req() req) {
    return this.transactionsService.getTransactionById(id, req.user);
  }

  /**
   * Create a new transaction
   */
  @Post('transfer')
  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req
  ) {
    return this.transactionsService.createTransaction(createTransactionDto, req.user.id);
  }

  /**
   * Confirm high-value transaction (ADMIN/MANAGER only)
   */
  @Patch(':id/confirm')
  async confirmTransaction(
    @Param('id') id: string,
    @Body() confirmTransactionDto: ConfirmTransactionDto,
    @Req() req
  ) {
    return this.transactionsService.confirmTransaction(id, confirmTransactionDto, req.user.id);
  }

  /**
   * Cancel a pending transaction
   */
  @Patch(':id/cancel')
  async cancelTransaction(@Param('id') id: string, @Req() req) {
    return this.transactionsService.cancelTransaction(id, req.user.id);
  }

  /**
   * Get pending approval transactions (ADMIN/MANAGER only)
   */
  @Get('pending-approval')
  async getPendingApprovalTransactions(@Query() dto: PaginationDto, @Req() req) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
      throw new ForbiddenException('Only admins and managers can access this route');
    }
    return this.transactionsService.getPendingApprovalTransactions(dto);
  }

  /**
   * Get transaction statistics for user dashboard
   */
  @Get('stats/my-stats')
  async getMyTransactionStats(
    @Query('period') period: 'day' | 'week' | 'month' = 'month',
    @Req() req
  ) {
    return this.transactionsService.getUserTransactionStats(req.user.id, period);
  }

  /**
   * Get transaction statistics for account
   */
  @Get('stats/account/:accountId')
  async getAccountTransactionStats(
    @Param('accountId') accountId: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'month',
    @Req() req
  ) {
    return this.transactionsService.getTransactionStats(accountId, period);
  }

  /**
   * Filter transactions by type and status
   * - Admin: all transactions
   * - User: only their own transactions
   */
  @Get('filter')
  async filterTransactions(
    @Query() dto: PaginationDto,
    @Query('type') type: TransactionType,
    @Query('status') status: TransactionStatus,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req
  ) {
    const filters = {
      type,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.transactionsService.filterTransactions(dto, filters, req.user);
  }
}