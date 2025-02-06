import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function HealthSummaryWidget() {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2">
          <div>
            <dt className="font-medium">Blood Type</dt>
            <dd className="text-sm text-muted-foreground">
              {user?.bloodType || "Not specified"}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Allergies</dt>
            <dd className="text-sm text-muted-foreground">
              {user?.allergies?.length
                ? user.allergies.join(", ")
                : "None specified"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
