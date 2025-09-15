import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsBoolean, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
    @ApiProperty({
        description: 'User email address',
        example: 'user@example.com',
        required: true
    })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({
        description: 'Username (optional)',
        example: 'johndoe',
        required: false
    })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({
        description: 'User role type',
        example: 'MEMBER',
        required: false
    })
    @IsOptional()
    @IsString()
    roleType?: string;
    
    @ApiPropertyOptional({
        description: 'Profile type or category',
        example: 'INDIVIDUAL',
        required: false
    })
    @IsOptional()
    @IsString()
    profile?: string;
    
    @ApiProperty({
        description: 'User password (minimum 6 characters)',
        example: 'securePassword123',
        minLength: 6,
        required: true
    })
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    // Profile fields
    @ApiPropertyOptional({ description: 'First name', example: 'John' })
    @IsOptional() firstName?: string;

    @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
    @IsOptional() lastName?: string;

    @ApiPropertyOptional({ 
        description: 'Birth date in ISO format', 
        example: '1990-01-15' 
    })
    @IsOptional() birthDate?: string;

    @ApiPropertyOptional({ 
        description: 'Place of birth', 
        example: 'Yaoundé, Cameroon' 
    })
    @IsOptional() birthPlace?: string;

    @ApiPropertyOptional({ 
        description: 'Nationality', 
        example: 'Cameroonian' 
    })
    @IsOptional() nationality?: string;

    @ApiPropertyOptional({ 
        description: 'Country of residence', 
        example: 'Cameroon' 
    })
    @IsOptional() resident?: string;

    @ApiPropertyOptional({ 
        description: 'Political or professional exposure', 
        example: 'None' 
    })
    @IsOptional() ppe?: string;

    @ApiPropertyOptional({ 
        description: 'National ID number', 
        example: '1234567890' 
    })
    @IsOptional() idNumber?: string;

    @ApiPropertyOptional({ 
        description: 'ID document issuer', 
        example: 'MINATD' 
    })
    @IsOptional() idIssuer?: string;

    @ApiPropertyOptional({ 
        description: 'ID issuance date in ISO format', 
        example: '2020-05-20' 
    })
    @IsOptional() idDate?: string;

    @ApiPropertyOptional({ 
        description: 'Phone number', 
        example: '+237 6XX XXX XXX' 
    })
    @IsOptional() phone?: string;

    @ApiPropertyOptional({ 
        description: 'Residential address', 
        example: '123 Main Street, Bastos' 
    })
    @IsOptional() address?: string;

    @ApiPropertyOptional({ 
        description: 'City of residence', 
        example: 'Yaoundé' 
    })
    @IsOptional() city?: string;

    @ApiPropertyOptional({ 
        description: 'Profession', 
        example: 'Software Engineer' 
    })
    @IsOptional() profession?: string;

    @ApiPropertyOptional({ 
        description: 'Employer/Company name', 
        example: 'Tech Solutions Inc.' 
    })
    @IsOptional() employer?: string;

    @ApiPropertyOptional({ 
        description: 'Marital status', 
        example: 'SINGLE',
        enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] 
    })
    @IsOptional() maritalStatus?: string;

    @ApiPropertyOptional({ 
        description: 'Number of children', 
        example: 2,
        minimum: 0 
    })
    @IsOptional() children?: number;

    @ApiPropertyOptional({ 
        description: 'Monthly salary', 
        example: 500000,
        minimum: 0 
    })
    @IsOptional() salary?: number;

    @ApiPropertyOptional({ 
        description: 'Digital signature (base64 encoded)', 
        example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...' 
    })
    @IsOptional() signature?: string;

    @ApiProperty({
        description: 'Acceptance of terms and conditions',
        example: true,
        required: true
    })
    @IsBoolean() 
    termsAccepted: boolean;

    // Emergency contacts
    @ApiPropertyOptional({ 
        description: 'Emergency contact 1 - Full name', 
        example: 'Jane Smith' 
    })
    @IsOptional() contact1Name: string;

    @ApiPropertyOptional({ 
        description: 'Emergency contact 1 - Phone number', 
        example: '+237 6XX XXX XXX' 
    })
    @IsOptional() contact1Phone: string;

    @ApiPropertyOptional({ 
        description: 'Emergency contact 1 - Email address', 
        example: 'jane.smith@example.com' 
    })
    @IsOptional() contact1Email: string;

    @ApiPropertyOptional({ 
        description: 'Emergency contact 1 - Relationship', 
        example: 'Sister' 
    })
    @IsOptional() contact1Relation: string;

    @ApiPropertyOptional({ 
        description: 'Emergency contact 2 - Full name', 
        example: 'Mike Johnson' 
    })
    @IsOptional() contact2Name: string;

    @ApiPropertyOptional({ 
        description: 'Emergency contact 2 - Phone number', 
        example: '+237 6XX XXX XXX' 
    })
    @IsOptional() contact2Phone: string;

    @ApiPropertyOptional({ 
        description: 'Emergency contact 2 - Email address', 
        example: 'mike.johnson@example.com' 
    })
    @IsOptional() contact2Email: string;

    @ApiPropertyOptional({ 
        description: 'Emergency contact 2 - Relationship', 
        example: 'Brother' 
    })
    @IsOptional() contact2Relation: string;

    // Accounts
    @ApiPropertyOptional({ 
        description: 'Open savings account (Epargne)', 
        example: true 
    })
    @IsOptional() accountEpargne?: boolean;

    @ApiPropertyOptional({ 
        description: 'Open current account (Courant)', 
        example: false 
    })
    @IsOptional() accountCourant?: boolean;

    @ApiPropertyOptional({ 
        description: 'Open Ndjangui account', 
        example: true 
    })
    @IsOptional() accountNDjangui?: boolean;

    @ApiPropertyOptional({ 
        description: 'Open checking account (Chèque)', 
        example: false 
    })
    @IsOptional() accountCheque?: boolean;

    @ApiPropertyOptional({ 
        description: 'Open investment account (Placement)', 
        example: true 
    })
    @IsOptional() accountPlacement?: boolean;

    // Documents
    @ApiPropertyOptional({ 
        description: 'Document type for upload', 
        example: 'ID_CARD',
        enum: ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE'] 
    })
    @IsOptional() type?: string;

    @ApiPropertyOptional({ 
        description: 'Front image of document (base64 encoded)', 
        example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...' 
    })
    @IsOptional() frontImage?: string;

    @ApiPropertyOptional({ 
        description: 'Back image of document (base64 encoded)', 
        example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...' 
    })
    @IsOptional() backImage?: string;
}