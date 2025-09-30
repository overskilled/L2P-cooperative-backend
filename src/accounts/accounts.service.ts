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
    console.log(`[DEPOSIT START] accountId: ${accountId}, amount: ${amount}, phone: ${phoneNumber}, method: ${method}`);

    if (amount <= 0) {
      console.log('[DEPOSIT ERROR] Amount must be greater than 0');
      throw new BadRequestException("Deposit amount must be greater than 0");
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account) {
      console.log('[DEPOSIT ERROR] Account not found');
      throw new NotFoundException("Account not found");
    }

    console.log(`[ACCOUNT FOUND] Account: ${account.id}, Current balance: ${account.balance}, User: ${account.userId}`);

    // Convert amount to Decimal for precise calculations
    const amountDecimal = new Prisma.Decimal(amount);
    const feeRate = new Prisma.Decimal(0.015);

    // Calculate fee and total amount using Decimal operations
    const feeAmount = amountDecimal.times(feeRate);
    const totalAmount = amountDecimal.plus(feeAmount);

    console.log(`[CALCULATIONS] Amount: ${amountDecimal}, Fee: ${feeAmount}, Total: ${totalAmount}`);

    // Step 1: Create pending transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        type: "DEPOSIT",
        status: "PENDING",
        amount: amountDecimal,
        fee: feeAmount,
        toAccountId: account.id,
        userId: account.userId,
        description: "Mobile Money Deposit (pending confirmation)",
      },
    });

    console.log(`[TRANSACTION CREATED] ID: ${transaction.id}, Status: ${transaction.status}`);

    // Step 2: Call Pawapay
    const apiUrl = "https://api.pawapay.io/v2/deposits";
    const token = process.env.PAWAPAY_API_KEY;

    // Convert totalAmount to integer string as required by Pawapay
    const totalAmountInteger = totalAmount.toDecimalPlaces(0).toString();

    const body = {
      depositId: transaction.id,
      amount: totalAmountInteger,
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

    console.log(`[PAWAPAY REQUEST] URL: ${apiUrl}, Body: ${JSON.stringify(body)}`);

    try {
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
      console.log('[PAWAPAY RESPONSE]', JSON.stringify(data));

      if (data.status !== "ACCEPTED") {
        console.log("[PAWAPAY ERROR]", data);

        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED", description: data?.message || "Deposit failed" },
        });

        console.log(`[TRANSACTION UPDATED] ID: ${transaction.id}, Status: FAILED`);
        throw new BadRequestException(data?.failureReason?.failureMessage || "Deposit failed");
      }

      // Store the pawapay-provided depositId if it differs from ours
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          description: `Pawapay deposit ${data.depositId} - awaiting final status`,
          metadata: { pawapayDepositId: data.depositId } // Store additional reference
        },
      });

      console.log(`[DEPOSIT INITIATED SUCCESS] Transaction ID: ${transaction.id}, Pawapay ID: ${data.depositId}`);
      return { transactionId: transaction.id, status: transaction.status };
    } catch (error) {
      console.error('[DEPOSIT PROCESSING ERROR]', error);
      throw error;
    }
  }

  /**
   * Check the final status of a deposit with comprehensive logging
   */
  async checkDepositStatus(transactionId: string) {
    console.log(`[CHECK STATUS START] Transaction ID: ${transactionId}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { toAccount: true },
    });

    if (!transaction) {
      console.log('[CHECK STATUS ERROR] Transaction not found');
      throw new NotFoundException("Transaction not found");
    }

    console.log(`[TRANSACTION DETAILS] ID: ${transaction.id}, Status: ${transaction.status}, Amount: ${transaction.amount}, Account: ${transaction.toAccountId}`);

    if (transaction.toAccount) {
      console.log(`[ACCOUNT DETAILS] ID: ${transaction.toAccount.id}, Current Balance: ${transaction.toAccount.balance}`);
    }

    if (transaction.status !== "PENDING") {
      console.log(`[STATUS ALREADY PROCESSED] Current status: ${transaction.status}`);
      return transaction; // already processed
    }

    const apiUrl = `https://api.pawapay.io/v2/deposits/${transaction.id}`;
    const token = process.env.PAWAPAY_API_KEY;

    console.log(`[PAWAPAY STATUS CHECK] URL: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();
      console.log('[PAWAPAY STATUS RESPONSE]', JSON.stringify(data));

      if (!response.ok) {
        console.log('[PAWAPAY STATUS ERROR]', data);
        throw new BadRequestException(data?.message || "Failed to check status");
      }

      const depositStatus = data.data?.status; // COMPLETED | FAILED | REVERSED | PENDING
      console.log(`[PAWAPAY DEPOSIT STATUS] ${depositStatus}`);

      // Use a transaction to ensure atomic updates
      if (depositStatus === "COMPLETED") {
        console.log('[PROCESSING COMPLETED DEPOSIT] Starting transaction...');

        return await this.prisma.$transaction(async (tx) => {
          console.log(`[BALANCE BEFORE UPDATE] Account: ${transaction.toAccountId}, Balance: ${transaction.toAccount?.balance}`);

          // Credit account using atomic increment
          const updatedAccount = await tx.account.update({
            where: { id: transaction.toAccountId! },
            data: {
              balance: {
                increment: transaction.amount
              }
            },
          });

          console.log(`[BALANCE AFTER UPDATE] Account: ${updatedAccount.id}, New Balance: ${updatedAccount.balance}`);

          // Verify the increment worked
          const balanceIncrease = new Prisma.Decimal(updatedAccount.balance).minus(transaction.toAccount?.balance || 0);
          console.log(`[BALANCE VERIFICATION] Expected increase: ${transaction.amount}, Actual increase: ${balanceIncrease}`);

          if (!balanceIncrease.equals(transaction.amount)) {
            console.error(`[BALANCE MISMATCH ERROR] Expected: ${transaction.amount}, Got: ${balanceIncrease}`);
            // You might want to throw an error or handle this discrepancy
          }

          // Update transaction status
          const updatedTransaction = await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "SUCCESS",
              description: "Deposit completed",
              updatedAt: new Date()
            },
          });

          console.log(`[TRANSACTION UPDATED] ID: ${updatedTransaction.id}, New Status: ${updatedTransaction.status}`);
          return updatedTransaction;
        });
      } else if (depositStatus === "FAILED" || depositStatus === "REVERSED") {
        console.log(`[PROCESSING ${depositStatus} DEPOSIT]`);

        const status = depositStatus === "FAILED" ? "FAILED" : "REVERSED";
        const updatedTransaction = await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: status,
            description: `Deposit ${depositStatus.toLowerCase()}`,
            updatedAt: new Date()
          },
        });

        console.log(`[TRANSACTION UPDATED] ID: ${updatedTransaction.id}, New Status: ${updatedTransaction.status}`);
        return updatedTransaction;
      }

      console.log('[DEPOSIT STILL PENDING] No action taken');
      return transaction; // still pending
    } catch (error) {
      console.error('[CHECK STATUS ERROR]', error);
      throw error;
    }
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
    console.log(`[WITHDRAWAL START] accountId: ${accountId}, amount: ${amount}, phone: ${phoneNumber}, method: ${method}`);

    if (amount <= 0) {
      console.log('[WITHDRAWAL ERROR] Amount must be greater than 0');
      throw new BadRequestException("Withdrawal amount must be greater than 0");
    }

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account) {
      console.log('[WITHDRAWAL ERROR] Account not found');
      throw new NotFoundException("Account not found");
    }

    console.log(`[ACCOUNT FOUND] Account: ${account.id}, Current balance: ${account.balance}, User: ${account.userId}`);

    const amountDecimal = new Prisma.Decimal(amount);
    const currentBalance = new Prisma.Decimal(account.balance);

    if (currentBalance.lt(amountDecimal)) {
      console.log(`[INSUFFICIENT FUNDS] Balance: ${currentBalance}, Requested: ${amountDecimal}`);
      throw new BadRequestException("Insufficient funds");
    }

    console.log(`[FUNDS VERIFIED] Balance: ${currentBalance}, Withdrawal: ${amountDecimal}, Remaining: ${currentBalance.minus(amountDecimal)}`);

    // Step 1: Create pending transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        type: "WITHDRAWAL",
        status: "PENDING",
        amount: amountDecimal,
        fromAccountId: account.id,
        userId: account.userId,
        description: "Mobile Money Withdrawal (pending confirmation)",
      },
    });

    console.log(`[TRANSACTION CREATED] ID: ${transaction.id}, Status: ${transaction.status}, Amount: ${transaction.amount}`);

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
      customerMessage: `Withdrawal`,
      amount: amountDecimal.toString(),
      currency: "XAF",
      metadata: [
        { fieldName: "customerId", fieldValue: `${transaction.id}`, isPII: true },
      ],
    };

    console.log(`[PAWAPAY PAYOUT REQUEST] URL: ${apiUrl}, Body: ${JSON.stringify(body)}`);

    try {
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
      console.log("[PAWAPAY PAYOUT RESPONSE]", JSON.stringify(data));

      if (data.status !== "ACCEPTED") {
        console.log("[PAWAPAY PAYOUT ERROR]", data);

        // Mark transaction as failed
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "FAILED", description: data?.message || "Withdrawal failed" },
        });

        console.log(`[TRANSACTION UPDATED] ID: ${transaction.id}, Status: FAILED`);
        throw new BadRequestException(data?.message || "Withdrawal failed");
      }

      // Store additional payout reference if needed
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          metadata: { pawapayPayoutId: data.payoutId }
        },
      });

      console.log(`[WITHDRAWAL INITIATED SUCCESS] Transaction ID: ${transaction.id}, Pawapay Payout ID: ${data.payoutId}`);
      return { transactionId: transaction.id, status: transaction.status };
    } catch (error) {
      console.error('[WITHDRAWAL PROCESSING ERROR]', error);
      throw error;
    }
  }

  async checkPayoutStatus(transactionId: string) {
    console.log(`[CHECK PAYOUT STATUS START] Transaction ID: ${transactionId}`);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { fromAccount: true }, // since payouts deduct from an account
    });

    if (!transaction) {
      console.log('[CHECK PAYOUT STATUS ERROR] Transaction not found');
      throw new NotFoundException("Transaction not found");
    }

    console.log(`[TRANSACTION DETAILS] ID: ${transaction.id}, Status: ${transaction.status}, Amount: ${transaction.amount}, Account: ${transaction.fromAccountId}`);

    if (transaction.fromAccount) {
      console.log(`[ACCOUNT DETAILS] ID: ${transaction.fromAccount.id}, Current Balance: ${transaction.fromAccount.balance}`);
    }

    if (transaction.status !== "PENDING") {
      console.log(`[STATUS ALREADY PROCESSED] Current status: ${transaction.status}`);
      return transaction; // already processed
    }

    const apiUrl = `https://api.pawapay.io/v2/payouts/${transaction.id}`;
    const token = process.env.PAWAPAY_API_KEY;

    console.log(`[PAWAPAY PAYOUT STATUS CHECK] URL: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();
      console.log('[PAWAPAY PAYOUT STATUS RESPONSE]', JSON.stringify(data));

      if (!response.ok) {
        console.log('[PAWAPAY PAYOUT STATUS ERROR]', data);
        throw new BadRequestException(data?.message || "Failed to check payout status");
      }

      const payoutStatus = data.data?.status; // COMPLETED | FAILED | REVERSED | PENDING
      console.log(`[PAWAPAY PAYOUT STATUS] ${payoutStatus}`);

      // Use a transaction to ensure atomic updates
      if (payoutStatus === "COMPLETED") {
        console.log('[PROCESSING COMPLETED PAYOUT] Starting transaction...');

        return await this.prisma.$transaction(async (tx) => {
          console.log(`[BALANCE BEFORE UPDATE] Account: ${transaction.fromAccountId}, Balance: ${transaction.fromAccount?.balance}`);

          // Debit account using atomic decrement
          const updatedAccount = await tx.account.update({
            where: { id: transaction.fromAccountId! },
            data: {
              balance: {
                decrement: transaction.amount
              }
            },
          });

          console.log(`[BALANCE AFTER UPDATE] Account: ${updatedAccount.id}, New Balance: ${updatedAccount.balance}`);

          // Verify the decrement worked
          const balanceDecrease = new Prisma.Decimal(transaction.fromAccount?.balance || 0).minus(updatedAccount.balance);
          console.log(`[BALANCE VERIFICATION] Expected decrease: ${transaction.amount}, Actual decrease: ${balanceDecrease}`);

          if (!balanceDecrease.equals(transaction.amount)) {
            console.error(`[BALANCE MISMATCH ERROR] Expected: ${transaction.amount}, Got: ${balanceDecrease}`);
            // You might want to throw an error or handle this discrepancy
          }

          // Update transaction status
          const updatedTransaction = await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: "SUCCESS",
              description: "Payout completed",
              updatedAt: new Date()
            },
          });

          console.log(`[TRANSACTION UPDATED] ID: ${updatedTransaction.id}, New Status: ${updatedTransaction.status}`);
          return updatedTransaction;
        });
      } else if (payoutStatus === "FAILED" || payoutStatus === "REVERSED") {
        console.log(`[PROCESSING ${payoutStatus} PAYOUT]`);

        const status = payoutStatus === "FAILED" ? "FAILED" : "REVERSED";
        const updatedTransaction = await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: status,
            description: `Payout ${payoutStatus.toLowerCase()}`,
            updatedAt: new Date()
          },
        });

        console.log(`[TRANSACTION UPDATED] ID: ${updatedTransaction.id}, New Status: ${updatedTransaction.status}`);
        return updatedTransaction;
      }

      console.log('[PAYOUT STILL PENDING] No action taken');
      return transaction; // still pending
    } catch (error) {
      console.error('[CHECK PAYOUT STATUS ERROR]', error);
      throw error;
    }
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

  async getUserTotalBalance(userId: string) {
    const result = await this.prisma.account.aggregate({
      where: {
        userId: userId,
      },
      _sum: {
        balance: true,
      },
    });

    return {
      totalBalance: result._sum.balance || 0,
      userId: userId,
    };
  }

  async getAvailableFunds(userId: string) {
    const result = await this.prisma.account.aggregate({
      where: {
        userId: userId,
        type: {
          in: ['COURANT', 'CHEQUE', 'PLACEMENT']
        }
      },
      _sum: {
        balance: true,
      },
    });

    return {
      availableFunds: result._sum.balance || 0,
      userId: userId,
      accountTypes: ['COURANT', 'CHEQUE', 'PLACEMENT'],
    };
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
