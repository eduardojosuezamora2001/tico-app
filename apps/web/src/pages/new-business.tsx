import { useNavigate, useParams } from "react-router"

import { BusinessProfileWizard } from "@/components/business-profile-wizard"
import { SiteHeader } from "@/components/site-header"

export function NewBusinessPage() {
  const navigate = useNavigate()
  const { draftId } = useParams()

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <BusinessProfileWizard
        mode="create"
        businessId={draftId ?? null}
        title="Publicar mi negocio"
        subtitle="Completa la ficha de tu local. Puedes guardar borrador y seguir después."
        backLink={{ to: "/mi-negocio", label: "Mis negocios" }}
        onDraftCreated={(id) => navigate(`/mi-negocio/nuevo/${id}`, { replace: true })}
        onPublished={(id) => navigate(`/mi-negocio/${id}`)}
      />
    </div>
  )
}
