import { api } from "@/lib/api"

/** Respuesta estándar `{ data: T }` del backend. */
export type ApiEnvelope<T> = { data: T }

export type Paginated<T> = {
  data: T
  nextCursor: string | null
}

export async function getData<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<ApiEnvelope<T>>(path, { params })
  return response.data.data
}

export async function getPage<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<Paginated<T>> {
  const response = await api.get<{ data: T; nextCursor: string | null }>(path, { params })
  return { data: response.data.data, nextCursor: response.data.nextCursor }
}

export async function postData<T, B = unknown>(path: string, body?: B): Promise<T> {
  const response = await api.post<ApiEnvelope<T>>(path, body)
  return response.data.data
}

export async function putData<T, B = unknown>(path: string, body?: B): Promise<T> {
  const response = await api.put<ApiEnvelope<T>>(path, body)
  return response.data.data
}

export async function patchData<T, B = unknown>(path: string, body?: B): Promise<T> {
  const response = await api.patch<ApiEnvelope<T>>(path, body)
  return response.data.data
}

export async function deleteData(path: string): Promise<void> {
  await api.delete(path)
}
