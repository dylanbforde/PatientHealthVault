import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, insertHealthRecordSchema, insertDocumentSchema, insertAppointmentSchema } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { NavBar } from "@/components/nav-bar";
import { AnimatedLayout } from "@/components/animated-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, FileUp, Stethoscope, Calendar } from "lucide-react";
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

// Update the health record schema to include private notes
const gpHealthRecordSchema = z.object({
  notes: z.string().min(1, "Medical notes are required"),
  privateNotes: z.string().optional(),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  treatment: z.string().min(1, "Treatment plan is required"),
});

export default function GPDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState("records");

  const lookupForm = useForm<z.infer<typeof patientCodeSchema>>({
    resolver: zodResolver(patientCodeSchema),
    defaultValues: {
      patientCode: "",
    },
  });

  const recordForm = useForm<z.infer<typeof gpHealthRecordSchema>>({
    resolver: zodResolver(gpHealthRecordSchema),
    defaultValues: {
      notes: "",
      privateNotes: "",
      diagnosis: "",
      treatment: "",
    },
  });

  const documentForm = useForm({
    resolver: zodResolver(insertDocumentSchema),
    defaultValues: {
      title: "",
      type: "lab_result",
      description: "",
      content: "",
      contentType: "",
      isPrivate: false,
    },
  });

  const appointmentForm = useForm({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      type: "checkup",
      datetime: new Date(),
      duration: 30,
      notes: "",
    },
  });

  // Query to fetch patient records when a patient is selected
  const { data: patientRecords, isLoading: isLoadingRecords } = useQuery({
    queryKey: ["/api/health-records", selectedPatient?.id],
    enabled: !!selectedPatient,
  });

  // Query to fetch patient documents
  const { data: patientDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/documents", selectedPatient?.id],
    enabled: !!selectedPatient,
  });

  // Query to fetch patient appointments
  const { data: patientAppointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ["/api/appointments", selectedPatient?.id],
    enabled: !!selectedPatient,
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
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertDocumentSchema>) => {
      if (!selectedPatient) throw new Error("No patient selected");
      const formData = new FormData();
      formData.append("file", data.content);
      formData.append("data", JSON.stringify({
        ...data,
        patientUuid: selectedPatient.uuid,
        uploadedBy: user?.username,
      }));

      const res = await apiRequest("POST", "/api/documents", formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedPatient?.id] });
      toast({
        title: "Document Uploaded",
        description: "The document has been uploaded successfully.",
      });
      documentForm.reset();
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertAppointmentSchema>) => {
      if (!selectedPatient) throw new Error("No patient selected");
      const appointment = {
        ...data,
        patientUuid: selectedPatient.uuid,
        gpUsername: user?.username,
      };

      const res = await apiRequest("POST", "/api/appointments", appointment);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", selectedPatient?.id] });
      toast({
        title: "Appointment Scheduled",
        description: "The appointment has been scheduled successfully.",
      });
      appointmentForm.reset();
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

          {/* Patient Management Tabs */}
          {selectedPatient && (
            <Card>
              <CardHeader>
                <CardTitle className="font-mono tracking-wider uppercase flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-primary" />
                  Patient Management - {selectedPatient.fullName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="records">Records</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  </TabsList>

                  {/* Records Tab */}
                  <TabsContent value="records">
                    <div className="space-y-4">
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
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents">
                    <div className="space-y-4">
                      <Form {...documentForm}>
                        <form onSubmit={documentForm.handleSubmit((data) => createDocumentMutation.mutate(data))} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={documentForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Document Title</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Enter document title" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={documentForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Document Type</FormLabel>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="w-full p-2 border rounded"
                                    >
                                      <option value="lab_result">Lab Result</option>
                                      <option value="prescription">Prescription</option>
                                      <option value="imaging">Imaging</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={documentForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Enter document description" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={documentForm.control}
                            name="content"
                            render={({ field: { onChange, ...field } }) => (
                              <FormItem>
                                <FormLabel>Upload Document</FormLabel>
                                <FormControl>
                                  <Input
                                    type="file"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        onChange(file);
                                        documentForm.setValue("contentType", file.type);
                                      }
                                    }}
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            disabled={createDocumentMutation.isPending}
                            className="w-full"
                          >
                            {createDocumentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload Document
                          </Button>
                        </form>
                      </Form>

                      {/* List of uploaded documents */}
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {patientDocuments?.map((doc) => (
                                <TableRow key={doc.id}>
                                  <TableCell>{format(new Date(doc.uploadedAt), "PP")}</TableCell>
                                  <TableCell>{doc.title}</TableCell>
                                  <TableCell>{doc.type}</TableCell>
                                  <TableCell>{doc.description}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Appointments Tab */}
                  <TabsContent value="appointments">
                    <div className="space-y-4">
                      <Form {...appointmentForm}>
                        <form onSubmit={appointmentForm.handleSubmit((data) => createAppointmentMutation.mutate(data))} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={appointmentForm.control}
                              name="datetime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date & Time</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="datetime-local"
                                      {...field}
                                      value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : ""}
                                      onChange={(e) => field.onChange(new Date(e.target.value))}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={appointmentForm.control}
                              name="type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Appointment Type</FormLabel>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="w-full p-2 border rounded"
                                    >
                                      <option value="checkup">Check-up</option>
                                      <option value="follow_up">Follow-up</option>
                                      <option value="consultation">Consultation</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={appointmentForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (minutes)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    min="15"
                                    max="120"
                                    step="15"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={appointmentForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Textarea {...field} placeholder="Enter appointment notes" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            disabled={createAppointmentMutation.isPending}
                            className="w-full"
                          >
                            {createAppointmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Schedule Appointment
                          </Button>
                        </form>
                      </Form>

                      {/* List of appointments */}
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4">Scheduled Appointments</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {patientAppointments?.map((appointment) => (
                                <TableRow key={appointment.id}>
                                  <TableCell>{format(new Date(appointment.datetime), "PPp")}</TableCell>
                                  <TableCell>{appointment.type}</TableCell>
                                  <TableCell>{appointment.duration} mins</TableCell>
                                  <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      appointment.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                                        appointment.status === "completed" ? "bg-green-100 text-green-800" :
                                          "bg-red-100 text-red-800"
                                    }`}>
                                      {appointment.status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
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