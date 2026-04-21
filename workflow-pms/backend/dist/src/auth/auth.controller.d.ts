import type { JwtPayload } from '../common/types/jwt-payload';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string;
            name: string;
            roles: string[];
        };
    }>;
    me(user: JwtPayload): {
        user: JwtPayload;
    };
}
