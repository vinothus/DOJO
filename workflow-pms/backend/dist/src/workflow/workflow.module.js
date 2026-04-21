"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowModule = void 0;
const common_1 = require("@nestjs/common");
const settings_module_1 = require("../settings/settings.module");
const workflow_access_service_1 = require("./workflow-access.service");
const handover_validation_service_1 = require("./handover-validation.service");
let WorkflowModule = class WorkflowModule {
};
exports.WorkflowModule = WorkflowModule;
exports.WorkflowModule = WorkflowModule = __decorate([
    (0, common_1.Module)({
        imports: [settings_module_1.SettingsModule],
        providers: [workflow_access_service_1.WorkflowAccessService, handover_validation_service_1.HandoverValidationService],
        exports: [workflow_access_service_1.WorkflowAccessService, handover_validation_service_1.HandoverValidationService],
    })
], WorkflowModule);
//# sourceMappingURL=workflow.module.js.map