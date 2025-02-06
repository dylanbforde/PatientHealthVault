import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { Loader2, Key } from "lucide-react";

export function PatientCodeWidget() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono tracking-wider uppercase flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            Patient Code
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!user || user.isGP) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono tracking-wider uppercase flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          Patient Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border border-primary/20 bg-background p-4 rounded">
          <p className="font-mono text-sm text-muted-foreground tracking-wider">
            Share this code with your GP to allow them to upload records to your account:
          </p>
          <p className="font-mono text-lg font-medium tracking-wider text-primary mt-2">
            {user.patientCode || 'Code not generated'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
