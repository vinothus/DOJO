import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    list(): import(".prisma/client").Prisma.PrismaPromise<({
        roles: ({
            role: {
                id: string;
                name: string;
                slug: string;
                createdAt: Date;
            };
        } & {
            roleId: string;
            userId: string;
        })[];
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        createdAt: Date;
        email: string;
        passwordHash: string;
        isActive: boolean;
    })[]>;
    create(dto: CreateUserDto): Promise<{
        roles: ({
            role: {
                id: string;
                name: string;
                slug: string;
                createdAt: Date;
            };
        } & {
            roleId: string;
            userId: string;
        })[];
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        createdAt: Date;
        email: string;
        passwordHash: string;
        isActive: boolean;
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
        roles: ({
            role: {
                id: string;
                name: string;
                slug: string;
                createdAt: Date;
            };
        } & {
            roleId: string;
            userId: string;
        })[];
    } & {
        id: string;
        updatedAt: Date;
        name: string;
        createdAt: Date;
        email: string;
        passwordHash: string;
        isActive: boolean;
    }>;
}
