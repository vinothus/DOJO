import { PrismaService } from '../prisma/prisma.service';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    create(data: {
        email: string;
        password: string;
        name: string;
        roleSlugs: string[];
    }): Promise<{
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
    update(id: string, data: {
        name?: string;
        password?: string;
        isActive?: boolean;
        roleSlugs?: string[];
    }): Promise<{
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
