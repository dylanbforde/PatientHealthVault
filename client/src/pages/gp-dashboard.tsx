import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, insertHealthRecordSchema } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { NavBar } from "@/components/nav-bar";
import { AnimatedLayout } from "@/components/animated-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, FileUp } from "lucide-react";

const patientCodeSchema = z.object({
  patientCode: z.string().min(1, "Patient code is required"),
});

export default function GPDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  
  const form = useForm<z.infer<typeof patientCodeSchema>>({
    resolver: zodResolver(patientCodeSchema),
  });

  const lookupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof patientCodeSchema>) => {
      const res = await apiRequest("POST", "/api/lookup-patient", data);
      return res.json();
    },
    onSuccess: (patient: User) => {
      setSelectedPatient(patient);
      toast({
        title: "Patient Found",
        description: `Found patient: ${patient.fullName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertHealthRecordSchema>) => {
      const res = await apiRequest("POST", "/api/records", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Record uploaded successfully. Patient will need to accept it.",
      });
      setSelectedPatient(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user?.isGP) {
    return (
      <AnimatedLayout>
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                This page is only accessible to GP accounts.
              </p>
            </CardContent>
          </Card>
        </main>
      </AnimatedLayout>
    );
  }

  return (
    <AnimatedLayout>
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono tracking-wider uppercase flex items-center gap-2">
              <FileUp className="h-4 w-4 text-primary" />
              Upload Patient Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => lookupMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="patientCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-sm">Patient Code</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter patient's unique code"
                          className="font-mono"
                          disabled={lookupMutation.isPending || !!selectedPatient}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {!selectedPatient && (
                  <Button 
                    type="submit" 
                    disabled={lookupMutation.isPending}
                    className="w-full font-mono"
                  >
                    {lookupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Lookup Patient
                  </Button>
                )}
              </form>
            </Form>

            {selectedPatient && (
              <div className="mt-8">
                <div className="border border-primary/20 bg-background p-4 rounded mb-4">
                  <p className="font-mono text-sm">
                    Patient: <span className="text-primary">{selectedPatient.fullName}</span>
                  </p>
                </div>

                {/* Add record upload form here */}
                <Button 
                  onClick={() => setSelectedPatient(null)} 
                  variant="outline" 
                  className="w-full font-mono"
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AnimatedLayout>
  );
}
