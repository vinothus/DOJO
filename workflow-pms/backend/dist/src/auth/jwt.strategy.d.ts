import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import type { JwtPayload } from '../common/types/jwt-payload';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): {
        name: string;
        sub: string;
        email: string;
        roles: string[];
    };
}
export {};
