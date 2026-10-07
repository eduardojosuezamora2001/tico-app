import { ScheduleRangeEditor } from "@/components/schedule-range-editor"
import { createScheduleGroup } from "@/lib/business-onboarding"
import { render, screen } from "@/test/test-utils"

describe("ScheduleRangeEditor", () => {
  it("muestra instrucciones y rangos de horario", () => {
    const groups = [createScheduleGroup({ fromDay: 1, toDay: 5, open: "08:00", close: "17:00" })]
    render(<ScheduleRangeEditor groups={groups} onChange={jest.fn()} />)
    expect(screen.getByText(/arma cada horario con un rango de días/i)).toBeInTheDocument()
    expect(screen.getByText(/08:00/)).toBeInTheDocument()
  })
})
