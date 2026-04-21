import { WorkspaceSettingsService } from './workspace-settings.service';
export declare class WorkspaceSettingsController {
    private readonly workspace;
    constructor(workspace: WorkspaceSettingsService);
    get(): Promise<import("./workspace-settings.types").WorkspaceSettingsV1>;
    patch(body: Record<string, unknown>): Promise<import("./workspace-settings.types").WorkspaceSettingsV1>;
}
