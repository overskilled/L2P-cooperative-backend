import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService
    ) { }


    // Get all transactions paginated 


    // Get transaction by ID


    // Emit transaction from one account to another based on the account based on rib (Note only transaction less than 500 000 FCFA are processes imediately)

    
    // Confirm transaction for amount greater than 500 000 FCFA

}
