import type { LanguageCode, Tables, User, UserRole } from "@workspace/shared"

/** Convierte la fila `users` (snake_case) al tipo de dominio `User`. */
export function toUser(row: Tables<"users">): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role as UserRole,
    preferredLanguage: row.preferred_language as LanguageCode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
