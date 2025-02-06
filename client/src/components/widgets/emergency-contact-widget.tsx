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
          Emergency Contacts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {user?.emergencyContacts && user.emergencyContacts.length > 0 ? (
          <div className="space-y-2">
            {user.emergencyContacts.map((contact, index) => (
              <div key={index} className="text-sm">
                <p className="font-medium">{contact.name}</p>
                <p className="text-muted-foreground">{contact.relationship}</p>
                <p className="text-muted-foreground">{contact.phone}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No emergency contacts specified
          </p>
        )}
      </CardContent>
    </Card>
  );
}