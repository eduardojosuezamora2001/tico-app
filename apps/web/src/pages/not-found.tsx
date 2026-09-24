import { Link } from "react-router"

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col gap-4 p-6 text-sm leading-loose">
      <h1 className="font-medium">Pagina no encontrada</h1>
      <Link className="underline" to="/">
        Volver al inicio
      </Link>
    </main>
  )
}
