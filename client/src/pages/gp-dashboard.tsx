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
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const patientCodeSchema = z.object({
  patientCode: z.string().min(1, "Patient code is required"),
});

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
  const [selectedTab, setSelectedTab] = useState<"records" | "documents" | "calendar" | "form" | "list">("records"); // Added "form" and "list" states

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

  const { data: patientRecords, isLoading: isLoadingRecords } = useQuery({
    queryKey: ["/api/health-records", selectedPatient?.id],
    enabled: !!selectedPatient,
  });

  const { data: patientDocuments, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/documents", selectedPatient?.id],
    enabled: !!selectedPatient,
  });

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
      const file = data.content as File;
      formData.append("file", file);
      formData.append("title", data.title);
      formData.append("type", data.type);
      formData.append("description", data.description || "");
      formData.append("patientUuid", selectedPatient.uuid);
      formData.append("uploadedBy", user?.username || "");
      formData.append("contentType", file.type);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to upload document');
      }

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
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertAppointmentSchema>) => {
      if (!selectedPatient) throw new Error("No patient selected");
      const appointment = {
        ...data,
        patientUuid: selectedPatient.uuid,
        gpUsername: user?.username,
        status: "scheduled" //Added status field
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
      setSelectedTab("calendar"); //Added to switch back to calendar after successful appointment scheduling.
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

  const AppointmentsTab = () => {
    const handleDateSelect = (selectInfo: any) => {
      const calendarApi = selectInfo.view.calendar;
      calendarApi.unselect();

      const start = new Date(selectInfo.start);
      appointmentForm.setValue("datetime", start);

      // Open the form dialog
      if (start > new Date()) {
        setSelectedTab("form");
      }
    };

    const [currentTab, setCurrentTab] = useState<"calendar" | "form" | "list">("calendar");

    return (
      <div className="space-y-4">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="form">Schedule</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <div className="rounded-lg border p-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                selectable={true}
                select={handleDateSelect}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'timeGridWeek,timeGridDay'
                }}
                events={patientAppointments?.map(apt => ({
                  id: apt.id.toString(),
                  title: `${apt.type} - ${selectedPatient?.fullName}`,
                  start: new Date(apt.datetime),
                  end: new Date(new Date(apt.datetime).getTime() + apt.duration * 60000),
                  backgroundColor: apt.status === 'scheduled' ? '#3b82f6' :
                    apt.status === 'completed' ? '#10b981' : '#ef4444'
                }))}
                slotMinTime="08:00:00"
                slotMaxTime="18:00:00"
                allDaySlot={false}
                slotDuration="00:15:00"
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5],
                  startTime: '08:00',
                  endTime: '18:00',
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="form">
            <div className="rounded-lg border p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Schedule Appointment</h3>
                <Button
                  variant="outline"
                  onClick={() => setCurrentTab("calendar")}
                  size="sm"
                >
                  Back to Calendar
                </Button>
              </div>
              <Form {...appointmentForm}>
                <form onSubmit={appointmentForm.handleSubmit((data) => {
                  const appointment = {
                    ...data,
                    gpUsername: user?.username,
                    patientUuid: selectedPatient?.uuid,
                    status: "scheduled"
                  };
                  createAppointmentMutation.mutate(appointment, {
                    onSuccess: () => setCurrentTab("calendar")
                  });
                })} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={appointmentForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
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
                    <FormField
                      control={appointmentForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="w-full p-2 border rounded"
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            >
                              <option value="15">15 minutes</option>
                              <option value="30">30 minutes</option>
                              <option value="45">45 minutes</option>
                              <option value="60">1 hour</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
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
                    {createAppointmentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Schedule Appointment
                  </Button>
                </form>
              </Form>
            </div>
          </TabsContent>

          <TabsContent value="list">
            <div className="rounded-lg border p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">All Appointments</h3>
                <Button
                  variant="outline"
                  onClick={() => setCurrentTab("calendar")}
                  size="sm"
                >
                  Back to Calendar
                </Button>
              </div>
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
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <AnimatedLayout>
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
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
                            render={({ field: { value, onChange, ...field } }) => (
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
                                    value={undefined}
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

                  <TabsContent value="appointments">
                    <AppointmentsTab />
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