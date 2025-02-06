import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type HealthRecord } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export function SharedRecordsView() {
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/shared-records"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shared Records</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {records?.map((record) => (
            <div key={record.id} className="border-b pb-4 last:border-0">
              <h4 className="font-medium">{record.title}</h4>
              <p className="text-sm text-muted-foreground">
                {format(new Date(record.date), "PPP")}
              </p>
              <p className="text-sm">{record.facility}</p>
              <p className="text-sm mt-2">{record.content.notes}</p>
            </div>
          ))}
          {!records?.length && (
            <p className="text-sm text-muted-foreground">No shared records found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
