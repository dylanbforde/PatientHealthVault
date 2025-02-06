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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const patientCodeSchema = z.object({
  patientCode: z.string().min(1, "Patient code is required"),
});

// Extend the health record schema for GP creation
const gpHealthRecordSchema = z.object({
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
    defaultValues: {
      patientCode: "",  // Initialize with empty string
    },
  });

  const recordForm = useForm<z.infer<typeof gpHealthRecordSchema>>({
    resolver: zodResolver(gpHealthRecordSchema),
    defaultValues: {
      notes: "",
      diagnosis: "",
      treatment: "",
    },
  });

  // Query to fetch patient records when a patient is selected
  const { data: patientRecords, isLoading: isLoadingRecords } = useQuery({
    queryKey: ["/api/health-records", selectedPatient?.id],
    enabled: !!selectedPatient,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/health-records?userId=${selectedPatient!.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch patient records");
      }
      return res.json();
    },
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

      console.log("Creating record for patient:", {
        patientId: selectedPatient.id,
        patientUuid: selectedPatient.uuid,
        patientName: selectedPatient.fullName,
        gpName: user?.fullName
      });

      const record = {
        patientUuid: selectedPatient.uuid, // Use the UUID instead of userId
        title: `${data.diagnosis} - ${format(new Date(), "PP")}`,
        date: new Date(),
        recordType: "GP Visit",
        facility: user?.fullName || "Unknown GP",
        content: {
          notes: data.notes,
          diagnosis: data.diagnosis,
          treatment: data.treatment
        },
        isEmergencyAccessible: false,
        sharedWith: [],
        status: "pending"
      };

      console.log("Sending record data:", JSON.stringify(record, null, 2));
      const res = await apiRequest("POST", "/api/health-records", record);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Server response error:", errorData);
        throw new Error(errorData.message || "Failed to create record");
      }

      const createdRecord = await res.json();
      console.log("Created record:", JSON.stringify(createdRecord, null, 2));
      return createdRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records", selectedPatient?.id] });
      toast({
        title: "Success",
        description: "Record created and shared with patient for review.",
      });
      recordForm.reset();
    },
    onError: (error: Error) => {
      console.error("Record creation error:", error);
      toast({
        title: "Error creating record",
        description: error.message || "Failed to create health record",
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

          {/* Patient Records and Creation Tabs */}
          {selectedPatient && (
            <Card>
              <CardHeader>
                <CardTitle className="font-mono tracking-wider uppercase flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-primary" />
                  Patient Records - {selectedPatient.fullName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="records" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="records">View Records</TabsTrigger>
                    <TabsTrigger value="create">Create New Record</TabsTrigger>
                  </TabsList>

                  <TabsContent value="records">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientRecords?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{format(new Date(record.date), "PP")}</TableCell>
                              <TableCell>{record.recordType}</TableCell>
                              <TableCell>{record.title}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  record.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                    record.status === "accepted" ? "bg-green-100 text-green-800" :
                                      "bg-red-100 text-red-800"
                                }`}>
                                  {record.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!patientRecords || patientRecords.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No records found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="create">
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
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </AnimatedLayout>
  );
}