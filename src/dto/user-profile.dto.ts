import { ApiProperty } from '@nestjs/swagger';

export class UserProfileResponse {
    @ApiProperty({ description: 'Unique user identifier', example: 1 })
    id: number;

    @ApiProperty({ description: 'User email address', example: 'user@example.com' })
    email: string;

    @ApiProperty({ description: 'Username', example: 'johndoe' })
    username: string;

    @ApiProperty({ description: 'First name', example: 'John' })
    firstName: string;

    @ApiProperty({ description: 'Last name', example: 'Doe' })
    lastName: string;

    @ApiProperty({
        description: 'User registration date',
        example: '2023-01-15T10:30:00.000Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Last profile update date',
        example: '2023-01-15T10:30:00.000Z'
    })
    updatedAt: Date;
}