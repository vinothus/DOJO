import { AddLookupValueDto } from './dtos/add-lookup-value.dto';
import { LookupsService } from './lookups.service';
export declare class LookupsController {
    private readonly lookups;
    constructor(lookups: LookupsService);
    list(code: string): Promise<{
        values: {
            id: string;
            createdAt: Date;
            value: string;
            sortOrder: number;
            lookupTypeId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        description: string | null;
        code: string;
    }>;
    add(code: string, body: AddLookupValueDto): Promise<{
        id: string;
        createdAt: Date;
        value: string;
        sortOrder: number;
        lookupTypeId: string;
    }>;
}
