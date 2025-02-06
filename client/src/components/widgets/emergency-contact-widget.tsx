import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Phone } from "lucide-react";

export function EmergencyContactWidget() {
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-destructive" />
          Emergency Contact
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {user?.emergencyContact || "No emergency contact specified"}
        </p>
      </CardContent>
    </Card>
  );
}
