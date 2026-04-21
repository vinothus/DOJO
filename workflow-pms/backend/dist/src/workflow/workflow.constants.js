"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_STAGE_ORDER = void 0;
exports.getNextStage = getNextStage;
const client_1 = require("@prisma/client");
exports.WORKFLOW_STAGE_ORDER = [
    client_1.WorkflowStage.INPUT_SITE_MEASUREMENT,
    client_1.WorkflowStage.DESIGNING_ENGINEERING,
    client_1.WorkflowStage.COORDINATION,
    client_1.WorkflowStage.FABRICATION_SHOP,
    client_1.WorkflowStage.MACHINING_SHOP,
    client_1.WorkflowStage.WAREHOUSE_STORE,
    client_1.WorkflowStage.TRANSPORT,
    client_1.WorkflowStage.SITE_INSTALLATION,
    client_1.WorkflowStage.INVOICE,
];
function getNextStage(current) {
    const i = exports.WORKFLOW_STAGE_ORDER.indexOf(current);
    if (i < 0 || i >= exports.WORKFLOW_STAGE_ORDER.length - 1)
        return null;
    return exports.WORKFLOW_STAGE_ORDER[i + 1];
}
//# sourceMappingURL=workflow.constants.js.map