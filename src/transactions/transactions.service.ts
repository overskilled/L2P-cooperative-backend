import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTransactionDto, ConfirmTransactionDto } from './dto/transaction.dto';
import { TransactionType, TransactionStatus, RoleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaginatedResponse, PaginationDto } from 'src/dto/pagination.dto';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2
    ) { }

    // Get all transactions paginated 
    async getAllTransactions(dto: PaginationDto) {
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 10;

        const skip = (page - 1) * limit;
        const take = limit;

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                skip,
                take,
                include: {
                    fromAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    },
                    toAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            this.prisma.transaction.count()
        ]);

        return new PaginatedResponse(transactions, total, dto);
    }

    // Get transaction by ID with user validation
    async getTransactionById(id: string, user: any) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                fromAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true
                            }
                        }
                    }
                },
                toAccount: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        // Check if user has access to this transaction
        if (user.role !== RoleType.ADMIN) {
            const fromUserId = transaction.fromAccount?.userId;
            const toUserId = transaction.toAccount?.userId;

            if (fromUserId !== user.id && toUserId !== user.id) {
                throw new ForbiddenException('You can only access your own transactions');
            }
        }

        return transaction;
    }

    // Get transactions by account ID with pagination and user validation
    async getTransactionsByAccount(accountId: string, paginationDto: PaginationDto, user: any) {
        // Verify user has access to this account
        if (user.role !== RoleType.ADMIN) {
            const account = await this.prisma.account.findUnique({
                where: { id: accountId },
                select: { userId: true }
            });

            if (!account) {
                throw new NotFoundException('Account not found');
            }

            if (account.userId !== user.id) {
                throw new ForbiddenException('You can only access your own account transactions');
            }
        }

        const page = Number(paginationDto.page) || 1;
        const limit = Number(paginationDto.limit) || 10;

        const skip = (page - 1) * limit;
        const take = limit;

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: {
                    OR: [
                        { fromAccountId: accountId },
                        { toAccountId: accountId }
                    ]
                },
                skip,
                take,
                include: {
                    fromAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    },
                    toAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            this.prisma.transaction.count({
                where: {
                    OR: [
                        { fromAccountId: accountId },
                        { toAccountId: accountId }
                    ]
                }
            })
        ]);

        return new PaginatedResponse(transactions, total, paginationDto);
    }

    // Get transactions by user ID with pagination
    async getTransactionsByUser(userId: string, dto: PaginationDto) {
        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 10;

        const skip = (page - 1) * limit;
        const take = limit;

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: {
                    OR: [
                        {
                            fromAccount: {
                                userId: userId
                            }
                        },
                        {
                            toAccount: {
                                userId: userId
                            }
                        }
                    ]
                },
                skip, // Explicitly pass skip
                take,
                include: {
                    fromAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    },
                    toAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            this.prisma.transaction.count({
                where: {
                    OR: [
                        {
                            fromAccount: {
                                userId: userId
                            }
                        },
                        {
                            toAccount: {
                                userId: userId
                            }
                        }
                    ]
                }
            })
        ]);

        return new PaginatedResponse(transactions, total, dto);
    }

    // Emit transaction from one account to another based on RIB
    async createTransaction(createTransactionDto: CreateTransactionDto, userId: string) {
        const { fromAccountRib, toAccountRib, amount, description } = createTransactionDto;

        // Validate amount
        if (amount <= 0) {
            throw new BadRequestException('Amount must be greater than zero');
        }

        // Find accounts
        const fromAccount = await this.prisma.account.findUnique({
            where: { rib: fromAccountRib },
            include: { user: true }
        });

        if (!fromAccount) {
            throw new NotFoundException('Source account not found');
        }

        // Check if user owns the source account
        if (fromAccount.userId !== userId) {
            throw new ForbiddenException('You can only transfer from your own accounts');
        }

        const toAccount = await this.prisma.account.findUnique({
            where: { rib: toAccountRib },
            include: { user: true }
        });

        if (!toAccount) {
            throw new NotFoundException('Destination account not found');
        }

        // Check if accounts are different
        if (fromAccount.id === toAccount.id) {
            throw new BadRequestException('Cannot transfer to the same account');
        }

        // Check sufficient balance
        if (new Decimal(fromAccount.balance).lessThan(amount)) {
            throw new BadRequestException('Insufficient funds');
        }

        // Check daily transfer limit (assuming 2,000,000 FCFA daily limit)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTransactions = await this.prisma.transaction.aggregate({
            where: {
                fromAccountId: fromAccount.id,
                status: TransactionStatus.COMPLETED,
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            },
            _sum: {
                amount: true
            }
        });

        const dailyTotal = todayTransactions._sum.amount || 0;
        const dailyTotalNum = new Decimal(dailyTotal).toNumber();
        if (dailyTotalNum + amount > 2000000) {
            throw new BadRequestException('Daily transfer limit exceeded');
        }

        // Calculate transaction fee
        const fee = this.calculateTransactionFee(amount);
        const totalAmount = new Decimal(amount).plus(fee).toNumber();

        // Determine transaction status based on amount
        const isHighValue = amount > 500000;
        const status = isHighValue ? TransactionStatus.PENDING_APPROVAL : TransactionStatus.PENDING;

        // Create transaction record
        const transaction = await this.prisma.transaction.create({
            data: {
                amount,
                description,
                type: TransactionType.TRANSFER,
                status,
                fromAccountId: fromAccount.id,
                toAccountId: toAccount.id,
                fee,
                metadata: {
                    requiresApproval: isHighValue
                }
            },
            include: {
                fromAccount: {
                    include: { user: true }
                },
                toAccount: {
                    include: { user: true }
                }
            }
        });

        // Process immediately if low value transaction
        if (!isHighValue) {
            await this.processTransaction(transaction.id);
        } else {
            // Emit event for high-value transaction requiring approval
            this.eventEmitter.emit('transaction.requires_approval', transaction);
        }

        return transaction;
    }

    // Process transaction (debit and credit accounts)
    private async processTransaction(transactionId: string) {
        return await this.prisma.$transaction(async (tx) => {
            // Get transaction with lock
            const transaction = await tx.transaction.findUnique({
                where: { id: transactionId },
                include: {
                    fromAccount: {
                        include: { user: true }
                    },
                    toAccount: {
                        include: { user: true }
                    }
                }
            });

            if (!transaction || transaction.status !== TransactionStatus.PENDING) {
                throw new BadRequestException('Transaction cannot be processed');
            }

            // Ensure account IDs are not null
            if (!transaction.fromAccountId || !transaction.toAccountId) {
                throw new BadRequestException('Invalid transaction accounts');
            }

            // Convert amount and fee to numbers for arithmetic operations
            const amount = new Decimal(transaction.amount).toNumber();
            const fee = new Decimal(transaction.fee || 0).toNumber();
            const totalDebit = amount + fee;

            // Update accounts
            await tx.account.update({
                where: { id: transaction.fromAccountId },
                data: { balance: { decrement: totalDebit } }
            });

            await tx.account.update({
                where: { id: transaction.toAccountId },
                data: { balance: { increment: amount } }
            });

            // Update transaction status
            const updatedTransaction = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.COMPLETED,
                    metadata: {
                        ...(transaction.metadata as any),
                        processedAt: new Date().toISOString()
                    }
                },
                include: {
                    fromAccount: {
                        include: { user: true }
                    },
                    toAccount: {
                        include: { user: true }
                    }
                }
            });

            // Emit events
            this.eventEmitter.emit('transaction.completed', updatedTransaction);

            if (updatedTransaction.fromAccount?.user) {
                this.eventEmitter.emit('notification.transaction', {
                    userId: updatedTransaction.fromAccount.user.id,
                    type: 'DEBIT',
                    amount: updatedTransaction.amount,
                    transactionId: updatedTransaction.id
                });
            }

            if (updatedTransaction.toAccount?.user) {
                this.eventEmitter.emit('notification.transaction', {
                    userId: updatedTransaction.toAccount.user.id,
                    type: 'CREDIT',
                    amount: updatedTransaction.amount,
                    transactionId: updatedTransaction.id
                });
            }

            return updatedTransaction;
        });
    }

    // Confirm transaction for amount greater than 500,000 FCFA
    async confirmTransaction(transactionId: string, confirmTransactionDto: ConfirmTransactionDto, userId: string) {
        const { approved, reason } = confirmTransactionDto;

        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                fromAccount: {
                    include: { user: true }
                }
            }
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        if (transaction.status !== TransactionStatus.PENDING_APPROVAL) {
            throw new BadRequestException('Transaction does not require approval');
        }

        // Check if user has permission to approve transactions
        const canApprove = await this.canApproveTransactions(userId);
        if (!canApprove) {
            throw new ForbiddenException('You do not have permission to approve transactions');
        }

        if (approved) {
            // Process the transaction
            return await this.processTransaction(transactionId);
        } else {
            // Update transaction status to rejected
            const rejectedTransaction = await this.prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.FAILED, // Using FAILED instead of REJECTED
                    metadata: {
                        ...(transaction.metadata as any),
                        rejectionReason: reason,
                        approvedBy: userId,
                        rejectedAt: new Date().toISOString()
                    }
                },
                include: {
                    fromAccount: {
                        include: { user: true }
                    }
                }
            });

            // Emit event for rejected transaction
            this.eventEmitter.emit('transaction.rejected', rejectedTransaction);

            if (rejectedTransaction.fromAccount?.user) {
                this.eventEmitter.emit('notification.transaction', {
                    userId: rejectedTransaction.fromAccount.user.id,
                    type: 'TRANSACTION_REJECTED',
                    amount: rejectedTransaction.amount,
                    transactionId: rejectedTransaction.id,
                    reason
                });
            }

            return rejectedTransaction;
        }
    }

    // Check if user can approve transactions
    private async canApproveTransactions(userId: string): Promise<boolean> {
        // In a real implementation, you would check the user's roles/permissions
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                roleType: true
            }
        });

        if (!user) return false;

        // Only ADMIN and MANAGER can approve transactions
        return user.roleType === RoleType.ADMIN || user.roleType === RoleType.BRANCH_MANAGER;
    }

    // Calculate transaction fee (example: 0.5% with a minimum of 100 FCFA and maximum of 2500 FCFA)
    private calculateTransactionFee(amount: number): number {
        const fee = amount * 0.005; // 0.5%
        return Math.min(Math.max(fee, 100), 2500);
    }

    // Get transaction statistics for dashboard
    async getTransactionStats(accountId: string, period: 'day' | 'week' | 'month' = 'month') {
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const stats = await this.prisma.transaction.groupBy({
            by: ['type', 'status'],
            where: {
                OR: [
                    { fromAccountId: accountId },
                    { toAccountId: accountId }
                ],
                createdAt: {
                    gte: startDate
                }
            },
            _count: {
                id: true
            },
            _sum: {
                amount: true
            }
        });

        return stats;
    }

    // Get user transaction statistics
    async getUserTransactionStats(userId: string, period: 'day' | 'week' | 'month' = 'month') {
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
        }

        const stats = await this.prisma.transaction.groupBy({
            by: ['type', 'status'],
            where: {
                OR: [
                    {
                        fromAccount: {
                            userId: userId
                        }
                    },
                    {
                        toAccount: {
                            userId: userId
                        }
                    }
                ],
                createdAt: {
                    gte: startDate
                }
            },
            _count: {
                id: true
            },
            _sum: {
                amount: true,
                fee: true
            }
        });

        return stats;
    }

    // Cancel a pending transaction
    async cancelTransaction(transactionId: string, userId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                fromAccount: {
                    include: { user: true }
                }
            }
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        // Check if user owns the account
        if (transaction.fromAccount?.userId !== userId) {
            throw new ForbiddenException('You can only cancel your own transactions');
        }

        if (transaction.status !== TransactionStatus.PENDING &&
            transaction.status !== TransactionStatus.PENDING_APPROVAL) {
            throw new BadRequestException('Only pending transactions can be cancelled');
        }

        const cancelledTransaction = await this.prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: TransactionStatus.FAILED, // Using FAILED instead of CANCELLED
                metadata: {
                    ...(transaction.metadata as any),
                    cancelledAt: new Date().toISOString(),
                    cancelledBy: userId
                }
            },
            include: {
                fromAccount: {
                    include: { user: true }
                }
            }
        });

        // Emit event for cancelled transaction
        this.eventEmitter.emit('transaction.cancelled', cancelledTransaction);

        return cancelledTransaction;
    }

    // Get pending approval transactions with pagination
    async getPendingApprovalTransactions(paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: {
                    status: TransactionStatus.PENDING_APPROVAL
                },
                skip,
                take: limit,
                include: {
                    fromAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    },
                    toAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            this.prisma.transaction.count({
                where: {
                    status: TransactionStatus.PENDING_APPROVAL
                }
            })
        ]);

        return new PaginatedResponse(transactions, total, paginationDto);
    }

    // Filter transactions with various criteria
    async filterTransactions(paginationDto: PaginationDto, filters: any, user: any) {
        const { page, limit } = paginationDto;
        const skip = (page - 1) * limit;

        const whereClause: any = {};

        // Add filters
        if (filters.type) whereClause.type = filters.type;
        if (filters.status) whereClause.status = filters.status;
        if (filters.startDate || filters.endDate) {
            whereClause.createdAt = {};
            if (filters.startDate) whereClause.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate) whereClause.createdAt.lte = new Date(filters.endDate);
        }

        // For non-admin users, restrict to their own transactions
        if (user.role !== RoleType.ADMIN) {
            whereClause.OR = [
                { fromAccount: { userId: user.id } },
                { toAccount: { userId: user.id } }
            ];
        }

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: whereClause,
                skip,
                take: limit,
                include: {
                    fromAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    },
                    toAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            this.prisma.transaction.count({ where: whereClause })
        ]);

        return new PaginatedResponse(transactions, total, paginationDto);
    }
}