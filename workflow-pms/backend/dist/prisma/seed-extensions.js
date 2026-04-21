"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePostDeployBootstrap = ensurePostDeployBootstrap;
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const workspace_settings_types_1 = require("../src/settings/workspace-settings.types");
async function ensurePostDeployBootstrap(prisma) {
    await prisma.systemSettings.upsert({
        where: { id: 'default' },
        create: {
            id: 'default',
            workspace: workspace_settings_types_1.DEFAULT_WORKSPACE,
        },
        update: {},
    });
    const stages = Object.values(client_1.WorkflowStage);
    const coord = await prisma.role.upsert({
        where: { slug: 'coordinator' },
        create: {
            slug: 'coordinator',
            name: 'Co-ordinator',
        },
        update: { name: 'Co-ordinator' },
    });
    for (const s of stages) {
        const isOwn = s === client_1.WorkflowStage.COORDINATION;
        await prisma.roleStageAccess.upsert({
            where: {
                roleId_stage: { roleId: coord.id, stage: s },
            },
            create: {
                roleId: coord.id,
                stage: s,
                canView: isOwn,
                canEdit: isOwn,
                canOverride: false,
            },
            update: {
                canView: isOwn,
                canEdit: isOwn,
            },
        });
    }
    const exists = await prisma.user.findUnique({
        where: { email: 'coordinator@example.com' },
    });
    if (!exists) {
        const hash = await bcrypt.hash('Coordinator123!', 10);
        await prisma.user.create({
            data: {
                email: 'coordinator@example.com',
                name: 'Co-ordinator User',
                passwordHash: hash,
                roles: { create: [{ roleId: coord.id }] },
            },
        });
        console.log('Co-ordinator demo user created — coordinator@example.com');
    }
}
//# sourceMappingURL=seed-extensions.js.map