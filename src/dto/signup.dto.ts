import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';

export class SignupDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsNotEmpty()
    @MinLength(6)
    password: string;

    // Profile fields
    @IsOptional() firstName?: string;
    @IsOptional() lastName?: string;
    @IsOptional() birthDate?: string; // ISO string, will be parsed into Date
    @IsOptional() birthPlace?: string;
    @IsOptional() nationality?: string;
    @IsOptional() resident?: string;
    @IsOptional() ppe?: string;
    @IsOptional() idNumber?: string;
    @IsOptional() idIssuer?: string;
    @IsOptional() idDate?: string;
    @IsOptional() phone?: string;
    @IsOptional() address?: string;
    @IsOptional() city?: string;
    @IsOptional() profession?: string;
    @IsOptional() employer?: string;
    @IsOptional() maritalStatus?: string;
    @IsOptional() children?: number;
    @IsOptional() salary?: number;

    @IsOptional() signature?: string;
    @IsBoolean() termsAccepted: boolean;

    // Emergency contacts
    @IsOptional() contact1Name: string;
    @IsOptional() contact1Phone: string;
    @IsOptional() contact1Email: string;
    @IsOptional() contact1Relation: string;

    @IsOptional() contact2Name: string;
    @IsOptional() contact2Phone: string;
    @IsOptional() contact2Email: string;
    @IsOptional() contact2Relation: string;

    // Accounts
    @IsOptional() accountEpargne?: boolean;
    @IsOptional() accountCourant?: boolean;
    @IsOptional() accountNDjangui?: boolean;
    @IsOptional() accountCheque?: boolean;
    @IsOptional() accountPlacement?: boolean;

    // Documents
    @IsOptional() frontCNI?: string;
    @IsOptional() backCNI?: string;
}
