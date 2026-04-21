"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WORKSPACE = void 0;
exports.mergeWorkspace = mergeWorkspace;
exports.tabVisible = tabVisible;
exports.patchWorkspace = patchWorkspace;
function allHeaderRequiredTrue() {
    return {
        year: true,
        month: true,
        area: true,
        client: true,
        plant: true,
        poNumber: true,
        bidNumber: true,
        projectId: true,
    };
}
exports.DEFAULT_WORKSPACE = {
    version: 1,
    projectHeaderHandover: allHeaderRequiredTrue(),
    projectCreate: {
        projectName: 'required',
        projectId: 'optional',
        year: 'optional',
        month: 'optional',
        area: 'optional',
        client: 'optional',
        plant: 'optional',
        poNumber: 'optional',
        bidNumber: 'optional',
    },
    stageTabs: {
        INPUT_SITE_MEASUREMENT: { bom: false },
    },
    stageHandover: {
        INPUT_SITE_MEASUREMENT: {
            requireTravel: true,
            requireBom: false,
            minAttachments: 1,
            requireManHours: true,
        },
        DESIGNING_ENGINEERING: {
            requireTravel: false,
            requireBom: true,
            minAttachments: 0,
            requireManHours: true,
            requireEngineeringWeights: true,
        },
        COORDINATION: {
            requireTravel: false,
            requireBom: false,
            minAttachments: 0,
            requireManHours: false,
        },
        FABRICATION_SHOP: {
            requireTravel: true,
            requireBom: false,
            minAttachments: 0,
            requireManHours: true,
        },
        MACHINING_SHOP: {
            requireTravel: false,
            requireBom: false,
            minAttachments: 1,
            requireManHours: true,
        },
        WAREHOUSE_STORE: {
            requireTravel: false,
            requireBom: false,
            minAttachments: 0,
            requireManHours: true,
        },
        TRANSPORT: {
            requireTravel: true,
            requireBom: false,
            minAttachments: 0,
            requireManHours: true,
        },
        SITE_INSTALLATION: {
            requireTravel: false,
            requireBom: false,
            minAttachments: 1,
            requireManHours: true,
        },
        INVOICE: {},
    },
};
function mergeWorkspace(fromDb) {
    const base = structuredClone(exports.DEFAULT_WORKSPACE);
    if (!fromDb || typeof fromDb !== 'object' || Array.isArray(fromDb)) {
        return base;
    }
    const o = fromDb;
    if (o.version === 1) {
        if (o.projectHeaderHandover && typeof o.projectHeaderHandover === 'object') {
            base.projectHeaderHandover = {
                ...base.projectHeaderHandover,
                ...o.projectHeaderHandover,
            };
        }
        if (o.projectCreate && typeof o.projectCreate === 'object') {
            base.projectCreate = {
                ...base.projectCreate,
                ...o.projectCreate,
            };
        }
        if (o.stageTabs && typeof o.stageTabs === 'object') {
            for (const [k, v] of Object.entries(o.stageTabs)) {
                if (v && typeof v === 'object' && !Array.isArray(v)) {
                    base.stageTabs[k] = {
                        ...(base.stageTabs[k] ?? {}),
                        ...v,
                    };
                }
            }
        }
        if (o.stageHandover && typeof o.stageHandover === 'object') {
            for (const [k, v] of Object.entries(o.stageHandover)) {
                base.stageHandover[k] = {
                    ...(base.stageHandover[k] ?? {}),
                    ...v,
                };
            }
        }
        if (o.handoverTransitions && typeof o.handoverTransitions === 'object') {
            base.handoverTransitions = { ...(base.handoverTransitions ?? {}) };
            for (const [k, v] of Object.entries(o.handoverTransitions)) {
                if (v && typeof v === 'object' && !Array.isArray(v)) {
                    base.handoverTransitions[k] = {
                        ...(base.handoverTransitions[k] ?? {}),
                        ...v,
                    };
                }
            }
        }
    }
    return base;
}
function tabVisible(settings, stage, tab) {
    const per = settings.stageTabs[stage];
    if (per && per[tab] === false)
        return false;
    if (per && per[tab] === true)
        return true;
    return true;
}
function patchWorkspace(current, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        return current;
    }
    const p = patch;
    const out = structuredClone(current);
    if (p.projectHeaderHandover) {
        Object.assign(out.projectHeaderHandover, p.projectHeaderHandover);
    }
    if (p.projectCreate) {
        Object.assign(out.projectCreate, p.projectCreate);
    }
    if (p.stageTabs) {
        for (const [k, v] of Object.entries(p.stageTabs)) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                out.stageTabs[k] = {
                    ...(out.stageTabs[k] ?? {}),
                    ...v,
                };
            }
        }
    }
    if (p.stageHandover) {
        for (const [k, v] of Object.entries(p.stageHandover)) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                out.stageHandover[k] = {
                    ...(out.stageHandover[k] ?? {}),
                    ...v,
                };
            }
        }
    }
    if (p.handoverTransitions) {
        out.handoverTransitions = { ...(out.handoverTransitions ?? {}) };
        for (const [k, v] of Object.entries(p.handoverTransitions)) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                out.handoverTransitions[k] = {
                    ...(out.handoverTransitions[k] ?? {}),
                    ...v,
                };
            }
        }
    }
    return out;
}
//# sourceMappingURL=workspace-settings.types.js.map