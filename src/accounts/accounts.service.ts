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
import { v4 as uuidv4 } from "uuid"
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
  /**
  * Initiate a deposit request via Pawapay
  */
  // async deposit(accountId: string, amount: number, phoneNumber: string, method: "mtn" | "orange") {
  //   const generateDepositId = () => uuidv4()

  //   if (amount <= 0) {
  //     throw new BadRequestException("Deposit amount must be greater than 0");
  //   }

  //   const account = await this.prisma.account.findUnique({
  //     where: { id: accountId },
  //   });

  //   if (!account) {
  //     throw new NotFoundException("Account not found");
  //   }

  //   // Build Pawapay request
  //   const apiUrl = "https://api.pawapay.io/deposits";
  //   const token = process.env.PAWAPAY_API_KEY;
  //   if (!token) {
  //     throw new NotFoundException("Missing Pawapay API key");
  //   }

  //   let depositId = generateDepositId();

  //   const body = {
  //     depositId, // unique id
  //     amount: amount.toString(),
  //     currency: "XAF",
  //     correspondent: method === "mtn" ? "MTN_MOMO_CMR" : "ORANGE_CMR",
  //     payer: { address: { value: `237${phoneNumber}` }, type: "MSISDN" },
  //     customerTimestamp: new Date().toISOString(),
  //     statementDescription: `NMD Deposit`,
  //     country: "CMR",
  //     preAuthorisationCode: "PMxQYqfDx", // optional if required
  //     metadata: [
  //       { fieldName: "accountId", fieldValue: accountId },
  //       // { fieldName: "customerEmail", fieldValue: account.ownerEmail, isPII: true },
  //     ],
  //   };

  //   const response = await fetch(apiUrl, {
  //     method: "POST",
  //     headers: {
  //       "Authorization": `Bearer ${token}`,
  //       "Content-Type": "application/json",
  //       "Accept": "application/json",
  //     },
  //     body: JSON.stringify(body),
  //   });

  //   const data = await response.json();

  //   if (!response.ok) {
  //     console.error("Pawapay API Error:", data);
  //     throw new BadRequestException(data?.message || "Deposit failed");
  //   }

  //   // If Pawapay succeeds, update local balance
  //   return { depositId, message: "Transacti"}
  // }

  async deposit(accountId: string, amount: number, phoneNumber: string, method: "mtn" | "orange") {
    if (amount <= 0) {
      throw new BadRequestException("Deposit amount must be greater than 0");
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    // Apply 1.5% fee (user pays this)
    const feeRate = 0.015;
    const amountNum = Number(amount); // or parseFloat(amount)
    const totalAmount = amountNum + amountNum * feeRate;


    // Step 1: Create pending transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        type: "DEPOSIT",
        status: "PENDING",
        amount: new Prisma.Decimal(amount),
        fee: new Prisma.Decimal(amount * feeRate),
        toAccountId: account.id,
        userId: account.userId,
        description: "Mobile Money Deposit (pending confirmation)",
      },
    });



    // Step 2: Call Pawapay
    const apiUrl = "https://api.pawapay.io/v2/deposits";
    const token = process.env.PAWAPAY_API_KEY;

    const body = {
      depositId: transaction.id, // link PawaPay with our transaction
      amount: totalAmount.toFixed(0).toString(),
      currency: "XAF",
      payer: {
        accountDetails: {
          phoneNumber: `237${phoneNumber}`,
          provider: method === "mtn" ? "MTN_MOMO_CMR" : "ORANGE_CMR"
        },
        type: "MMO"
      },
      clientReferenceId: new Date().toISOString(),
      customerMessage: "L2P Deposit"
    };


    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log('Pawapay response: ', data)

    if (data.status !== "ACCEPTED") {
      console.log("Pawapay Error:", data);  

      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", description: data?.message || "Deposit failed" },
      });

      throw new BadRequestException(data?.failureReason.failureMessage || "Deposit failed");
    }

    // Store the pawapay-provided depositId if it differs from ours
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { description: `Pawapay deposit ${data.depositId} - awaiting final status` },
    });

    return { transactionId: transaction.id, status: transaction.status };
  }



  /**
   * Check the final status of a deposit
   */
  async checkDepositStatus(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { toAccount: true },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.status !== "PENDING") {
      return transaction; // already processed
    }

    const apiUrl = `https://api.pawapay.io/v2/deposits/${transaction.id}`;
    const token = process.env.PAWAPAY_API_KEY;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new BadRequestException(data?.message || "Failed to check status");
    }

    const depositStatus = data.data?.status; // COMPLETED | FAILED | REVERSED | PENDING

    if (depositStatus === "COMPLETED") {
      // credit account
      await this.prisma.account.update({
        where: { id: transaction.toAccountId! },
        data: { balance: { increment: transaction.amount } },
      });

      return this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCESS", description: "Deposit completed" },
      });
    } else if (depositStatus === "FAILED" || depositStatus === "REVERSED") {
      return this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: depositStatus, description: "Deposit failed/reversed" },
      });
    }

    return transaction; // still pending
  }



  // ------------------------------
  //  Withdraw funds
  // ------------------------------
  async withdraw(
    accountId: string,
    amount: number,
    phoneNumber: string,
    method: "mtn" | "orange"
  ) {
    if (amount <= 0) {
      throw new BadRequestException("Withdrawal amount must be greater than 0");
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account) {
      throw new NotFoundException("Account not found");
    }

    if (new Prisma.Decimal(account.balance).lt(amount)) {
      throw new BadRequestException("Insufficient funds");
    }

    // Step 1: Create pending transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        type: "WITHDRAWAL",
        status: "PENDING",
        amount: new Prisma.Decimal(amount),
        fromAccountId: account.id,
        userId: account.userId,
        description: "Mobile Money Withdrawal (pending confirmation)",
      },
    });

    // Step 2: Call Pawapay Payouts API
    const apiUrl = "https://api.pawapay.io/v2/payouts";
    const token = process.env.PAWAPAY_API_KEY;

    const body = {
      payoutId: transaction.id, // link Pawapay payout to our transaction
      recipient: {
        type: "MMO",
        accountDetails: {
          phoneNumber: `237${phoneNumber}`, // Cameroon phone numbers
          provider: method === "mtn" ? "MTN_MOMO_CMR" : "ORANGE_CMR",
        },
      },
      customerMessage: `Withdrawal for account`,
      amount: amount.toString(),
      currency: "XAF",
      metadata: [
        // { fieldName: "accountId", fieldValue: account.id },
        { fieldName: "customerId", fieldValue: `${transaction.id}`, isPII: true },
      ],
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log("Pawapay payout response: ", data)

    if (data.status !== "ACCEPTED") {
      console.log("Pawapay Payout Error:", data);

      // Mark transaction as failed
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "FAILED", description: data?.message || "Withdrawal failed" },
      });

      throw new BadRequestException(data?.message || "Withdrawal failed");
    }

    return { transactionId: transaction.id, status: transaction.status };
  }


  async checkPayoutStatus(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { fromAccount: true }, // since payouts deduct from an account
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.status !== "PENDING") {
      return transaction; // already processed
    }

    const apiUrl = `https://api.pawapay.io/v2/payouts/${transaction.id}`;
    const token = process.env.PAWAPAY_API_KEY;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new BadRequestException(data?.message || "Failed to check payout status");
    }

    const payoutStatus = data.data?.status; // COMPLETED | FAILED | REVERSED | PENDING

    if (payoutStatus === "COMPLETED") {
      // debit account if not already debited
      await this.prisma.account.update({
        where: { id: transaction.fromAccountId! },
        data: { balance: { decrement: transaction.amount } },
      });

      return this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "SUCCESS", description: "Payout completed" },
      });
    } else if (payoutStatus === "FAILED" || payoutStatus === "REVERSED") {
      return this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: payoutStatus, description: "Payout failed/reversed" },
      });
    }

    return transaction; // still pending
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
