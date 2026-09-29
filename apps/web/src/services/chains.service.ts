import type {
  AttachChainLocationInput,
  Business,
  BusinessChain,
  CreateBusinessChainInput,
} from "@workspace/shared"

import { getData, postData } from "@/services/http"

export async function listChains() {
  return getData<BusinessChain[]>("/chains")
}

export async function createChain(input: CreateBusinessChainInput) {
  return postData<BusinessChain>("/chains", input)
}

export async function attachChainLocation(chainId: string, input: AttachChainLocationInput) {
  return postData<Business>(`/chains/${chainId}/locations`, input)
}
