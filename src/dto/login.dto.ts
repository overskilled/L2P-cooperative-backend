import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'User\'s email address or username',
        example: 'user@example.com',
        required: true
    })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({
        description: 'User\'s password',
        example: 'securePassword123',
        required: true,
        minLength: 6
    })
    @IsNotEmpty()
    @IsString()
    password: string;
}