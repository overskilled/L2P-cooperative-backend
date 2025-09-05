import { IsString, IsNumber, IsPositive, IsOptional, IsBoolean } from 'class-validator';

export class CreateTransactionDto {
    @IsString()
    fromAccountRib: string;

    @IsString()
    toAccountRib: string;

    @IsNumber()
    @IsPositive()
    amount: number;

    @IsString()
    @IsOptional()
    description?: string;
}

export class ConfirmTransactionDto {
    @IsBoolean()
    approved: boolean;

    @IsString()
    @IsOptional()
    reason?: string;
}