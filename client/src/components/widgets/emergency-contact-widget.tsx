import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Phone, User } from "lucide-react";
import type { User as UserType } from "@shared/schema";

export function EmergencyContactWidget() {
  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-destructive" />
            <span className="font-mono tracking-wider uppercase">Emergency Contacts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.emergencyContacts && user.emergencyContacts.length > 0 ? (
            <div className="space-y-4">
              {user.emergencyContacts.map((contact, index) => (
                <div key={index} className="border border-primary/20 bg-background p-4 rounded">
                  <p className="font-mono font-medium tracking-wider text-primary">{contact.name}</p>
                  <p className="font-mono text-sm text-muted-foreground tracking-wider">{contact.relationship}</p>
                  <p className="font-mono text-sm text-muted-foreground tracking-wider">{contact.phone}</p>
                  {contact.email && (
                    <p className="font-mono text-sm text-muted-foreground tracking-wider">{contact.email}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-sm text-muted-foreground tracking-wider">
              No emergency contacts specified
            </p>
          )}
        </CardContent>
      </Card>

      {(user?.gpName || user?.gpContact) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span className="font-mono tracking-wider uppercase">General Practitioner</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-primary/20 bg-background p-4 rounded">
              {user.gpName && <p className="font-mono font-medium tracking-wider text-primary">{user.gpName}</p>}
              {user.gpContact && (
                <p className="font-mono text-sm text-muted-foreground tracking-wider">{user.gpContact}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}