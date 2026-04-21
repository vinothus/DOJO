"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_SLUG_TO_STAGE = void 0;
exports.stagesForRoles = stagesForRoles;
exports.isAdmin = isAdmin;
const client_1 = require("@prisma/client");
exports.ROLE_SLUG_TO_STAGE = {
    site_measurement: client_1.WorkflowStage.INPUT_SITE_MEASUREMENT,
    engineering: client_1.WorkflowStage.DESIGNING_ENGINEERING,
    coordinator: client_1.WorkflowStage.COORDINATION,
    fab_shop: client_1.WorkflowStage.FABRICATION_SHOP,
    machining: client_1.WorkflowStage.MACHINING_SHOP,
    warehouse: client_1.WorkflowStage.WAREHOUSE_STORE,
    transport: client_1.WorkflowStage.TRANSPORT,
    site_installation: client_1.WorkflowStage.SITE_INSTALLATION,
    invoice: client_1.WorkflowStage.INVOICE,
};
function stagesForRoles(roleSlugs) {
    const out = new Set();
    for (const r of roleSlugs) {
        const s = exports.ROLE_SLUG_TO_STAGE[r];
        if (s)
            out.add(s);
    }
    return [...out];
}
function isAdmin(roleSlugs) {
    return roleSlugs.includes('admin');
}
//# sourceMappingURL=role-workflow.js.map