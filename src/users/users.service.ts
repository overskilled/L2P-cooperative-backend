import { Injectable } from '@nestjs/common';

export type User = {
    userId: string
    username: string
    password: string
}

@Injectable()
export class UsersService {
    async findUserByName(username: string): Promise<User | undefined> {
        const users: User[] = [
            {
                userId: '1',
                username: 'john',
                password: 'changeme',
            },
            {
                userId: '2',
                username: 'maria',
                password: 'guess',
            },
        ];
        return users.find(user => user.username === username);
    }
}
