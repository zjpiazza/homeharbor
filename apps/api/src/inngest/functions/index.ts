import { createTenantAndSeedFn } from "./createTenant.js";
import { detectAnomaliesFn } from "./detectAnomalies.js";

export const functions = [createTenantAndSeedFn, detectAnomaliesFn];
