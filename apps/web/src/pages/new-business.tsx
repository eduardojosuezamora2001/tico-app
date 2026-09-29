import { useNavigate, useParams, useSearchParams } from "react-router"

import { BusinessProfileWizard } from "@/components/business-profile-wizard"
import { SiteHeader } from "@/components/site-header"

export function NewBusinessPage() {
  const navigate = useNavigate()
  const { draftId } = useParams()
  const [searchParams] = useSearchParams()
  const chainId = searchParams.get("chainId")

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <BusinessProfileWizard
        mode="create"
        businessId={draftId ?? null}
        chainId={chainId}
        title={chainId ? "Nueva sede de cadena" : "Publicar mi negocio"}
        subtitle={
          chainId
            ? "Registra una sucursal adicional bajo tu cadena. Puedes guardar borrador y seguir después."
            : "Completa la ficha de tu local. Puedes guardar borrador y seguir después."
        }
        backLink={{ to: "/mi-negocio", label: "Mis negocios" }}
        onDraftCreated={(id) => navigate(`/mi-negocio/nuevo/${id}`, { replace: true })}
        onPublished={(id) => navigate(`/mi-negocio/${id}`)}
      />
    </div>
  )
}
