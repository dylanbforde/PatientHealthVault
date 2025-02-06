import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
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
import { Loader2, FileUp, Stethoscope } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const patientCodeSchema = z.object({
  patientCode: z.string().min(1, "Patient code is required"),
});

// Extend the health record schema for GP creation
const gpHealthRecordSchema = insertHealthRecordSchema.extend({
  notes: z.string().min(1, "Medical notes are required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  treatment: z.string().min(1, "Treatment plan is required"),
});

export default function GPDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);

  const lookupForm = useForm<z.infer<typeof patientCodeSchema>>({
    resolver: zodResolver(patientCodeSchema),
  });

  const recordForm = useForm<z.infer<typeof gpHealthRecordSchema>>({
    resolver: zodResolver(gpHealthRecordSchema),
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

  const createRecordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof gpHealthRecordSchema>) => {
      if (!selectedPatient) throw new Error("No patient selected");

      const record = {
        ...data,
        userId: selectedPatient.id,
        status: "pending",
        facility: user?.fullName || "Unknown GP",
        date: new Date().toISOString(),
      };

      const res = await apiRequest("POST", "/api/health-records", record);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Record created and shared with patient for review.",
      });
      recordForm.reset();
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
        <div className="space-y-8">
          {/* Patient Lookup Card */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono tracking-wider uppercase flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Patient Lookup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...lookupForm}>
                <form onSubmit={lookupForm.handleSubmit((data) => lookupMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={lookupForm.control}
                    name="patientCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-sm">Patient Code</FormLabel>
                        <FormDescription>
                          Enter the patient's unique code to look up their record
                        </FormDescription>
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
            </CardContent>
          </Card>

          {/* Record Creation Card */}
          {selectedPatient && (
            <Card>
              <CardHeader>
                <CardTitle className="font-mono tracking-wider uppercase flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-primary" />
                  Create Medical Record
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 border border-primary/20 rounded-lg bg-muted/50">
                  <p className="font-mono text-sm">
                    Creating record for: <span className="text-primary">{selectedPatient.fullName}</span>
                  </p>
                </div>

                <Form {...recordForm}>
                  <form onSubmit={recordForm.handleSubmit((data) => createRecordMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={recordForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Enter detailed medical notes" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={recordForm.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diagnosis</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter diagnosis" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={recordForm.control}
                      name="treatment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Treatment Plan</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Enter treatment plan" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createRecordMutation.isPending}
                      >
                        {createRecordMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Record
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedPatient(null);
                          lookupForm.reset();
                          recordForm.reset();
                        }}
                      >
                        Clear Form
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </AnimatedLayout>
  );
}