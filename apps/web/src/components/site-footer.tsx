import { Link } from "react-router"

type FooterLink = { to: string; label: string }

type FooterColumnConfig = {
  title: string
  links: FooterLink[]
}

const exploreLinks: FooterColumnConfig = {
  title: "Explorar Costa Rica",
  links: [
    { to: "/", label: "Comercios cerca" },
    { to: "/?category=Sodas", label: "Sodas y cafeterías" },
    { to: "/?category=Farmacia", label: "Farmacias" },
  ],
}

const ownerLinks: FooterColumnConfig = {
  title: "Para propietarios",
  links: [
    { to: "/registro", label: "Registrar negocio" },
    { to: "/mi-negocio", label: "Panel comercio" },
    { to: "/mi-negocio/nuevo", label: "Publicar local" },
  ],
}

const supportLinks: FooterColumnConfig = {
  title: "Atención local",
  links: [
    { to: "/mensajes", label: "Centro de ayuda 24/7" },
    { to: "/cuenta", label: "Mi cuenta" },
  ],
}

export function SiteFooter({
  variant = "full",
  className = "",
}: {
  variant?: "full" | "compact"
  className?: string
}) {
  if (variant === "compact") {
    return (
      <footer className={`shrink-0 border-t border-border ${className}`.trim()}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
          <p>TicoApp · Directorio de comercios locales</p>
          <Link className="hover:text-foreground" to="/registro">
            Registrar un negocio
          </Link>
        </div>
      </footer>
    )
  }

  return (
    <footer className={`shrink-0 border-t border-border bg-card/40 ${className}`.trim()}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <p className="text-lg font-semibold text-primary">TicoAppCR</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Directorio de comercios locales con chat directo, catálogo y coordinación de pedidos.
          </p>
          <p className="mt-3 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Transferencia móvil integrada
          </p>
        </div>
        <FooterColumn {...exploreLinks} />
        <FooterColumn {...ownerLinks} />
        <FooterColumn {...supportLinks} />
      </div>
      <div className="border-t border-border/80 px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} TicoAppCR · Hecho para comercios costarricenses
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: FooterColumnConfig) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {links.map((link) => (
          <li key={`${link.to}-${link.label}`}>
            <Link className="text-foreground/80 transition-colors hover:text-primary" to={link.to}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
