import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type HealthRecord } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export function SharedRecordsView() {
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/shared-records"],
    staleTime: 0,
    gcTime: 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono tracking-wider uppercase">Shared Records</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono tracking-wider uppercase">Shared Records</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {records?.map((record) => (
            <div key={record.id} className="border border-primary/20 bg-background p-4 rounded">
              <h4 className="font-mono font-medium tracking-wider text-primary">{record.title}</h4>
              <p className="font-mono text-sm text-muted-foreground tracking-wider">
                {format(new Date(record.date), "PPP")}
              </p>
              <p className="font-mono text-sm text-primary/80 tracking-wider">{record.facility}</p>
              <p className="font-mono text-sm mt-2 text-muted-foreground tracking-wider whitespace-pre-wrap">
                {typeof record.content === 'object' && 'notes' in record.content ? record.content.notes : ''}
              </p>
            </div>
          ))}
          {!records?.length && (
            <p className="font-mono text-sm text-muted-foreground tracking-wider">
              No shared records found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}