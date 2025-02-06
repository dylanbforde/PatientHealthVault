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
                  {contact.email && (
                    <p className="text-muted-foreground">{contact.email}</p>
                  )}
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

      {(user?.gpName || user?.gpContact) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              General Practitioner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {user.gpName && <p className="font-medium">{user.gpName}</p>}
              {user.gpContact && (
                <p className="text-muted-foreground">{user.gpContact}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}