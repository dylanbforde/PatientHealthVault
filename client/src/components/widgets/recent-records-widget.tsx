import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type HealthRecord } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export function RecentRecordsWidget() {
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Records</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Get the 3 most recent records
  const recentRecords = [...(records || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentRecords.map((record) => (
            <div key={record.id} className="border-b pb-2 last:border-0">
              <h4 className="font-medium">{record.title}</h4>
              <p className="text-sm text-muted-foreground">
                {format(new Date(record.date), "PPP")}
              </p>
              <p className="text-sm">{record.facility}</p>
            </div>
          ))}
          {recentRecords.length === 0 && (
            <p className="text-sm text-muted-foreground">No records found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
