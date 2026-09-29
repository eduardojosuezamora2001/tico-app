import { MODULES, type BusinessModule, type ModuleName } from "@workspace/shared"

import { getData, putData } from "@/services/http"

export async function listBusinessModules(businessId: string) {
  return getData<BusinessModule[]>(`/businesses/${businessId}/modules`)
}

export async function setBusinessModule(
  businessId: string,
  moduleName: ModuleName,
  enabled: boolean,
) {
  return putData<BusinessModule>(`/businesses/${businessId}/modules/${moduleName}`, { enabled })
}

export async function syncBusinessModules(
  businessId: string,
  modules: Record<ModuleName, boolean>,
) {
  for (const moduleName of Object.values(MODULES)) {
    await setBusinessModule(businessId, moduleName, modules[moduleName])
  }
}
