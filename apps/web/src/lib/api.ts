import axios from "axios"

import { env } from "@/lib/env"
import { supabase } from "@/lib/supabase"

/**
 * Cliente HTTP hacia apps/api. Adjunta el access token de Supabase en cada
 * peticion para que el backend pueda autenticar al usuario.
 */
export const api = axios.create({
  baseURL: `${env.VITE_API_URL}/api`,
  timeout: 15_000,
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
