import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type HealthRecord } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { NavBar } from "@/components/nav-bar";
import { AnimatedLayout } from "@/components/animated-layout";

export default function SharedRecordsPage() {
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/shared-records"],
    staleTime: 0, // Don't cache the data
    cacheTime: 0, // Remove from cache immediately when component unmounts
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AnimatedLayout>
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Records Shared With You</CardTitle>
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
                    <p className="text-sm mt-2">
                      {typeof record.content === 'object' && 'notes' in record.content ? record.content.notes : ''}
                    </p>
                  </div>
                ))}
                {!records?.length && (
                  <p className="text-sm text-muted-foreground">
                    No shared records found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AnimatedLayout>
  );
}