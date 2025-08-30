import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { generateAccountNumber } from './account.utils';
import {
  Prisma,
  AccountType,
  TransactionType,
  TransactionStatus,
  RoleType,
} from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { PaginatedResponse, PaginationDto } from 'src/dto/pagination.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) { }

  // ------------------------------
  //  Open account (generate RIB)
  // ------------------------------
  async openAccount(
    userId: string,
    type: AccountType,
    bankId: string,
    agencyId: string,
  ) {
    // 1️⃣ Find the active account for this user & type
    const account = await this.prisma.account.findFirst({
      where: { userId, type, active: true },
    });

    if (!account) {
      throw new NotFoundException(
        'No active account found for this user and type',
      );
    }

    if (account.rib) {
      throw new BadRequestException('This account is already opened with a RIB');
    }

    // 2️⃣ Generate unique RIB
    let rib = '';
    let exists = true;

    while (exists) {
      const randomAccountNumber = Math.floor(Math.random() * 99999999999)
        .toString()
        .padStart(11, '0');

      rib = generateAccountNumber(bankId, agencyId, randomAccountNumber);

      const existing = await this.prisma.account.findUnique({ where: { rib } });
      exists = !!existing;
    }

    // 3️⃣ Update account with generated RIB
    return this.prisma.account.update({
      where: { id: account.id },
      data: { rib },
    });
  }

  // ------------------------------
  //  Transfer funds (only from COURANT accounts)
  // ------------------------------
  async transfer(fromAccountId: string, toAccountId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than 0');
    }

    const fromAccount = await this.prisma.account.findUnique({
      where: { id: fromAccountId },
    });
    const toAccount = await this.prisma.account.findUnique({
      where: { id: toAccountId },
    });

    if (!fromAccount || !toAccount) {
      throw new NotFoundException('One or both accounts not found');
    }
    if (fromAccount.type !== 'COURANT') {
      throw new BadRequestException(
        'Transfers are allowed only from current (COURANT) accounts',
      );
    }
    if (new Prisma.Decimal(fromAccount.balance).lt(amount)) {
      throw new BadRequestException('Insufficient funds in source account');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedFrom = await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: new Prisma.Decimal(amount) } },
      });

      const updatedTo = await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: new Prisma.Decimal(amount) } },
      });

      await tx.transaction.create({
        data: {
          type: TransactionType.TRANSFER,
          status: TransactionStatus.SUCCESS,
          amount: new Prisma.Decimal(amount),
          fromAccountId,
          toAccountId,
        },
      });

      return { from: updatedFrom, to: updatedTo };
    });
  }

  // ------------------------------
  //  Deposit funds
  // ------------------------------
  async deposit(accountId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than 0');
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: new Prisma.Decimal(amount) } },
    });
  }

  // ------------------------------
  //  Withdraw funds
  // ------------------------------
  async withdraw(accountId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than 0');
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (new Prisma.Decimal(account.balance).lt(amount)) {
      throw new BadRequestException('Insufficient funds');
    }

    return this.prisma.account.update({
      where: { id: accountId },
      data: { balance: { decrement: new Prisma.Decimal(amount) } },
    });
  }


  /**
  * Get all accounts for a given userId
  */
  async getUserAccounts(userId: string, dto: PaginationDto) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 10;

    const skip = (page - 1) * limit;
    const take = limit;

    const [data, total] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.account.count({ where: { userId } }),
    ]);

    return new PaginatedResponse(data, total, dto);
  }

  /**
   * Get all accounts grouped by users (ADMIN only)
   */
  async getAccountsGroupedByUsers(dto: PaginationDto, role: RoleType) {

    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 10;

    const skip = (page - 1) * limit;
    const take = limit;


    if (role !== RoleType.ADMIN) {
      throw new ForbiddenException('Only admins can access grouped accounts');
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        include: {
          accounts: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return new PaginatedResponse(data, total, dto);
  }

  /**
   * Get all active accounts (ADMIN only)
   */
  async getActiveAccounts(dto: PaginationDto, role: RoleType) {

    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 10;

    const skip = (page - 1) * limit;
    const take = limit;

    if (role !== RoleType.ADMIN) {
      throw new ForbiddenException('Only admins can access active accounts');
    }

    const [data, total] = await Promise.all([
      this.prisma.account.findMany({
        where: { active: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.account.count({ where: { active: true } }),
    ]);

    return new PaginatedResponse(data, total, dto);
  }

  /**
   * Get accounts by type and active status
   * - If user, filtered by userId
   * - If admin, all users
   */
  async getAccountsByTypeAndStatus(
    dto: PaginationDto,
    role: RoleType,
    filters: { userId?: string; type?: string; isActive?: boolean },
  ) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 10;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    if (role !== RoleType.ADMIN) {
      where.userId = filters.userId;
    }

    const [data, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.account.count({ where }),
    ]);

    return new PaginatedResponse(data, total, dto);
  }
}
