import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { HealthSummaryWidget } from "./widgets/health-summary-widget";
import { RecentRecordsWidget } from "./widgets/recent-records-widget";
import { EmergencyContactWidget } from "./widgets/emergency-contact-widget";
import { PatientCodeWidget } from "./widgets/patient-code-widget";

export function DashboardWidgets() {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[400px] rounded-lg border">
      <ResizablePanel defaultSize={25}>
        <div className="p-4 space-y-4">
          <PatientCodeWidget />
          <HealthSummaryWidget />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={45}>
        <div className="p-4">
          <RecentRecordsWidget />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={30}>
        <div className="p-4">
          <EmergencyContactWidget />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}