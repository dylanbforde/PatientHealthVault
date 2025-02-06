import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type HealthRecord } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  const toggleEmergencyAccess = useMutation({
    mutationFn: async ({ id, isEmergencyAccessible }: { id: number; isEmergencyAccessible: boolean }) => {
      const res = await apiRequest(
        "PUT",
        `/api/health-records/${id}/emergency-access`,
        { isEmergencyAccessible }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Health Records Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="font-medium">Full Name</dt>
                  <dd className="text-muted-foreground">{user?.fullName}</dd>
                </div>
                <div>
                  <dt className="font-medium">Blood Type</dt>
                  <dd className="text-muted-foreground">
                    {user?.bloodType || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Emergency Contact</dt>
                  <dd className="text-muted-foreground">
                    {user?.emergencyContact || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Allergies</dt>
                  <dd className="text-muted-foreground">
                    {user?.allergies?.length
                      ? user.allergies.join(", ")
                      : "None specified"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Emergency Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.date), "PP")}
                      </TableCell>
                      <TableCell>{record.title}</TableCell>
                      <TableCell>{record.facility}</TableCell>
                      <TableCell>{record.recordType}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`emergency-${record.id}`}
                            checked={record.isEmergencyAccessible}
                            onCheckedChange={(checked) =>
                              toggleEmergencyAccess.mutate({
                                id: record.id,
                                isEmergencyAccessible: checked,
                              })
                            }
                          />
                          <Label htmlFor={`emergency-${record.id}`}>
                            {record.isEmergencyAccessible ? "Enabled" : "Disabled"}
                          </Label>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
