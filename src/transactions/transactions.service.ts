import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateTransactionDto, ConfirmTransactionDto } from './dto/transaction.dto';
import { TransactionType, TransactionStatus, RoleType, Prisma } from '@prisma/client';
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


    async getTransactionsByUserAndStatus(userId: string, status: string, dto: PaginationDto) {

        console.log("Status received:", status);
        // Validate status parameter
        const validStatuses = ['PENDING', , "SUCCESS", 'COMPLETED', 'FAILED', 'CANCELLED', 'PROCESSING'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const page = Number(dto.page) || 1;
        const limit = Number(dto.limit) || 10;
        const skip = (page - 1) * limit;
        const take = limit;

        const whereClause = {
            AND: [
                {
                    OR: [
                        { fromAccount: { userId: userId } },
                        { toAccount: { userId: userId } }
                    ]
                },
                { status: status as TransactionStatus }
            ]
        };

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: whereClause,
                skip,
                take,
                include: {
                    fromAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: { select: { id: true, email: true } }
                        }
                    },
                    toAccount: {
                        select: {
                            id: true,
                            rib: true,
                            user: { select: { id: true, email: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.transaction.count({ where: whereClause })
        ]);

        return new PaginatedResponse(transactions, total, dto);
    }


    async searchTransactions(userId: string, searchParams: {
        page?: number;
        size?: number;
        column?: string;
        value?: string;
        operator?: string;
    }) {
        const page = Number(searchParams.page) || 0;
        const size = Number(searchParams.size) || 10;
        const skip = page * size;
        const take = size;

        // Build the where clause dynamically based on search parameters
        const whereClause: any = {
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
        };

        // Add search filters if provided
        if (searchParams.column && searchParams.value) {
            const searchCondition = this.buildSearchCondition(
                searchParams.column,
                searchParams.value,
                searchParams.operator
            );

            whereClause.AND = [searchCondition];
        }

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: whereClause,
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
                                    email: true,
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
                                    email: true,
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
                where: whereClause
            })
        ]);

        return {
            data: transactions,
            pagination: {
                page: page,
                size: size,
                total: total,
                totalPages: Math.ceil(total / size)
            }
        };
    }


    async countTransactionsByUser(userId: string): Promise<number> {
        return this.prisma.transaction.count({
            where: {
                OR: [
                    {
                        fromAccount: {
                            userId: userId,
                        },
                    },
                    {
                        toAccount: {
                            userId: userId,
                        },
                    },
                ],
            },
        });
    }


    // Emit transaction from one account to another based on RIB
    async createTransaction(createTransactionDto: CreateTransactionDto, userId: string) {
        const { fromAccountRib, toAccountRib, amount, description } = createTransactionDto;

        if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');

        const fromAccount = await this.prisma.account.findUnique({
            where: { rib: fromAccountRib },
            include: { user: true },
        });
        if (!fromAccount) throw new NotFoundException('Source account not found');
        if (fromAccount.userId !== userId) throw new ForbiddenException('You can only transfer from your own accounts');

        const toAccount = await this.prisma.account.findUnique({
            where: { rib: toAccountRib },
            include: { user: true },
        });
        if (!toAccount) throw new NotFoundException('Destination account not found');
        if (fromAccount.id === toAccount.id) throw new BadRequestException('Cannot transfer to the same account');
        if (new Decimal(fromAccount.balance).lessThan(amount)) throw new BadRequestException('Insufficient funds');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTransactions = await this.prisma.transaction.aggregate({
            where: {
                fromAccountId: fromAccount.id,
                status: TransactionStatus.COMPLETED,
                createdAt: { gte: today, lt: tomorrow },
            },
            _sum: { amount: true },
        });

        const dailyTotalNum = new Decimal(todayTransactions._sum.amount || 0).toNumber();
        if (dailyTotalNum + amount > 2_000_000) throw new BadRequestException('Daily transfer limit exceeded');

        const fee = this.calculateTransactionFee(amount);
        const isHighValue = amount > 500_000;
        const status = isHighValue ? TransactionStatus.PENDING_APPROVAL : TransactionStatus.PENDING;

        // Create transaction and process atomically
        const transaction = await this.prisma.$transaction(async (tx) => {
            const txRecord = await tx.transaction.create({
                data: {
                    amount,
                    description,
                    type: TransactionType.TRANSFER,
                    status,
                    fromAccountId: fromAccount.id,
                    toAccountId: toAccount.id,
                    fee,
                    metadata: { requiresApproval: isHighValue },
                },
                include: {
                    fromAccount: { include: { user: true } },
                    toAccount: { include: { user: true } },
                },
            });

            // Only do account updates inside the transaction
            if (!isHighValue) {
                const updated = await this.processTransaction(txRecord.id, tx, userId);
                return updated;
            }

            return txRecord;
        }, { timeout: 10000 }); // optional: increase timeout to 10s

        // Emit events outside transaction (non-blocking)
        if (isHighValue) this.eventEmitter.emit('transaction.requires_approval', transaction);

        return transaction;
    }

    // Process transaction: only DB updates here    
    private async processTransaction(
        transactionId: string,
        tx: Prisma.TransactionClient,
        processedBy?: string
    ) {
        const transaction = await tx.transaction.findUnique({
            where: { id: transactionId },
            include: {
                fromAccount: { include: { user: true } },
                toAccount: { include: { user: true } },
            },
        });

        if (!transaction || transaction.status !== TransactionStatus.PENDING)
            throw new BadRequestException('Transaction cannot be processed');
        if (!transaction.fromAccountId || !transaction.toAccountId)
            throw new BadRequestException('Invalid transaction accounts');

        const amount = new Decimal(transaction.amount).toNumber();
        const fee = new Decimal(transaction.fee || 0).toNumber();
        const totalDebit = amount + fee;

        // Update balances inside transaction
        await tx.account.update({
            where: { id: transaction.fromAccountId },
            data: { balance: { decrement: totalDebit } },
        });

        await tx.account.update({
            where: { id: transaction.toAccountId },
            data: { balance: { increment: amount } },
        });

        const updatedTransaction = await tx.transaction.update({
            where: { id: transactionId },
            data: {
                status: TransactionStatus.COMPLETED,
                metadata: {
                    ...(transaction.metadata as any),
                    processedAt: new Date().toISOString(),
                    processedBy,
                },
            },
            include: {
                fromAccount: { include: { user: true } },
                toAccount: { include: { user: true } },
            },
        });

        // Emit notifications outside transaction
        setImmediate(() => {
            this.eventEmitter.emit('transaction.completed', updatedTransaction);

            if (updatedTransaction.fromAccount?.user) {
                this.eventEmitter.emit('notification.transaction', {
                    userId: updatedTransaction.fromAccount.user.id,
                    type: 'DEBIT',
                    amount: updatedTransaction.amount,
                    transactionId: updatedTransaction.id,
                });
            }
            if (updatedTransaction.toAccount?.user) {
                this.eventEmitter.emit('notification.transaction', {
                    userId: updatedTransaction.toAccount.user.id,
                    type: 'CREDIT',
                    amount: updatedTransaction.amount,
                    transactionId: updatedTransaction.id,
                });
            }
        });

        return updatedTransaction;
    }



    async confirmTransaction(
        transactionId: string,
        confirmTransactionDto: ConfirmTransactionDto,
        userId: string
    ) {
        const { approved, reason } = confirmTransactionDto;

        // Find transaction
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                fromAccount: { include: { user: true } },
                toAccount: { include: { user: true } },
            },
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        if (transaction.status !== TransactionStatus.PENDING_APPROVAL) {
            throw new BadRequestException('Transaction does not require approval');
        }

        // Check if user can approve transactions
        const canApprove = await this.canApproveTransactions(userId);
        if (!canApprove) {
            throw new ForbiddenException('You do not have permission to approve transactions');
        }

        if (approved) {
            // ✅ Process transaction inside a Prisma transaction
            return await this.prisma.$transaction(async (tx) => {
                // Mark transaction as PENDING first to ensure proper locking
                await tx.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: TransactionStatus.PENDING,
                        metadata: {
                            ...(transaction.metadata as any),
                            approvedBy: userId,
                            approvedAt: new Date().toISOString(),
                        },
                    },
                });

                // Process the transaction using the updated processTransaction
                return this.processTransaction(transactionId, tx);
            });
        } else {
            // Reject the transaction
            const rejectedTransaction = await this.prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: TransactionStatus.FAILED, // or REJECTED if you prefer
                    metadata: {
                        ...(transaction.metadata as any),
                        rejectionReason: reason,
                        approvedBy: userId,
                        rejectedAt: new Date().toISOString(),
                    },
                },
                include: {
                    fromAccount: { include: { user: true } },
                    toAccount: { include: { user: true } },
                },
            });

            // Emit event for rejected transaction
            this.eventEmitter.emit('transaction.rejected', {
                transactionId: rejectedTransaction.id,
                fromUserId: rejectedTransaction.fromAccount?.user?.id,
                toUserId: rejectedTransaction.toAccount?.user?.id,
                amount: rejectedTransaction.amount,
                status: rejectedTransaction.status,
                reason,
            });

            // Emit user notification
            if (rejectedTransaction.fromAccount?.user) {
                this.eventEmitter.emit('notification.transaction', {
                    userId: rejectedTransaction.fromAccount.user.id,
                    type: 'TRANSACTION_REJECTED',
                    amount: rejectedTransaction.amount,
                    transactionId: rejectedTransaction.id,
                    reason,
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
        // const fee = amount * 0.005; // 0.5%
        // return Math.min(Math.max(fee, 100), 2500);
        return 0
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
                status: TransactionStatus.FAILED,
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

    private buildSearchCondition(column: string, value: string, operator: string = "contains") {
        switch (operator) {
            case "equals":
                return { [column]: value };
            case "contains":
                return {
                    [column]: {
                        contains: value,
                        mode: 'insensitive' as Prisma.QueryMode
                    }
                };
            case "startsWith":
                return {
                    [column]: {
                        startsWith: value,
                        mode: 'insensitive' as Prisma.QueryMode
                    }
                };
            case "endsWith":
                return {
                    [column]: {
                        endsWith: value,
                        mode: 'insensitive' as Prisma.QueryMode
                    }
                };
            default:
                return {
                    [column]: {
                        contains: value,
                        mode: 'insensitive' as Prisma.QueryMode
                    }
                };
        }
    }
}