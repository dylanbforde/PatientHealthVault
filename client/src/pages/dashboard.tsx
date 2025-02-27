import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type HealthRecord, insertHealthRecordSchema } from "@shared/schema";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline } from "@/components/timeline";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { insertUserSchema } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import { EmergencyContactsForm } from "@/components/emergency-contacts-form";
import { SharedRecordsView } from "@/components/shared-records-view";
import { NavBar } from "@/components/nav-bar";
import { RecordSharingForm } from "@/components/record-sharing-form";
import RecordSearch from "@/components/record-search";
import logger from "@/lib/logger";

// Updated ViewRecordDialog to handle content properly
export function ViewRecordDialog({ record }: { record: HealthRecord }) {
  const [activeTab, setActiveTab] = useState<"details" | "sharing">("details");
  const content = record.content as Record<string, string>;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{record.title}</DialogTitle>
        <DialogDescription>
          Created on {format(new Date(record.date), "PPP")}
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "details" | "sharing")}>
        <TabsList>
          <TabsTrigger value="details">Record Details</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid gap-4 py-4">
            <div>
              <h3 className="font-medium mb-2">Record Type</h3>
              <p className="text-sm text-muted-foreground">{record.recordType}</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Healthcare Facility</h3>
              <p className="text-sm text-muted-foreground">{record.facility}</p>
            </div>
            {content && (
              <>
                <div>
                  <h3 className="font-medium mb-2">Diagnosis</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {content.diagnosis || ""}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Treatment Plan</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {content.treatment || ""}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Medical Notes</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">
                      {content.notes || ""}
                    </p>
                  </div>
                </div>
              </>
            )}
            <div>
              <h3 className="font-medium mb-2">Emergency Access</h3>
              <p className="text-sm text-muted-foreground">
                {record.isEmergencyAccessible ? "Enabled" : "Disabled"}
              </p>
            </div>
            {record.verifiedAt && (
              <div>
                <h3 className="font-medium mb-2">Verification</h3>
                <p className="text-sm text-muted-foreground">
                  Verified by {record.verifiedBy} on{" "}
                  {format(new Date(record.verifiedAt), "PPP")}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sharing">
          <RecordSharingForm
            recordId={record.id}
            sharedWith={record.sharedWith || []}
          />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

// Updated NewRecordForm with proper validation and error handling
function NewRecordForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const { user } = useAuth();
  const form = useForm({
    resolver: zodResolver(
      insertHealthRecordSchema.extend({
        content: insertHealthRecordSchema.shape.content.default({
          notes: "",
          diagnosis: "",
          treatment: "",
        }),
      })
    ),
    defaultValues: {
      title: "",
      date: new Date(),
      recordType: "",
      facility: "",
      content: {
        notes: "",
        diagnosis: "",
        treatment: "",
      },
      isEmergencyAccessible: false,
      sharedWith: [],
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          logger.info("Form submission started", {
            userId: user?.id,
            userUuid: user?.uuid,
          });

          try {
            const formattedData = {
              ...data,
              patientUuid: user?.uuid,
              date: data.date instanceof Date ? data.date : new Date(data.date),
            };
            logger.debug("Formatted form data", { formattedData });
            onSubmit(formattedData);
          } catch (error) {
            logger.error("Error formatting form data", { error });
            throw error;
          }
        })}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={
                    field.value instanceof Date
                      ? field.value.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setHours(12);
                    field.onChange(date);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recordType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Record Type</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Lab Test, Prescription, Visit" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="facility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Healthcare Facility</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Hospital or clinic name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content.diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnosis</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter diagnosis" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content.treatment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treatment Plan</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter treatment plan" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content.notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Notes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter medical notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isEmergencyAccessible"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Allow Emergency Access</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Record"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [searchParams, setSearchParams] = useState<Record<string, string | undefined>>({});

  const handleSearch = async (params: Record<string, string | undefined>) => {
    logger.info("Search params received", { params });
    setSearchParams(params);
    refetch();
  };

  // Move createRecord mutation inside the component to access context
  const createRecord = useMutation({
    mutationFn: async (data: any) => {
      logger.info("Creating record mutation started", { data });

      if (!user?.uuid) {
        logger.error("User not authenticated");
        throw new Error("User not authenticated");
      }

      try {
        const recordData = {
          patientUuid: user.uuid,
          title: data.title,
          date: data.date instanceof Date ? data.date : new Date(data.date),
          recordType: data.recordType,
          content: {
            notes: data.content.notes,
            diagnosis: data.content.diagnosis,
            treatment: data.content.treatment,
          },
          facility: data.facility,
          status: "accepted", // Patient's own records are automatically accepted
          isEmergencyAccessible: data.isEmergencyAccessible,
          sharedWith: []
        };

        logger.debug("Sending record data to server", { recordData });
        const res = await apiRequest("POST", "/api/health-records", recordData);

        if (!res.ok) {
          const errorData = await res.json();
          logger.error("Server error response", { errorData });
          throw new Error(errorData.message || "Failed to create record");
        }

        const responseData = await res.json();
        logger.info("Record created successfully", { responseData });
        return responseData;
      } catch (error) {
        logger.error("Error in record creation", { error });
        throw error;
      }
    },
    onSuccess: () => {
      logger.info("Record creation mutation succeeded");
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      toast({
        title: "Record created",
        description: "Your health record has been created successfully.",
      });
    },
    onError: (error: Error) => {
      logger.error("Record creation mutation failed", { error });
      toast({
        title: "Error creating record",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleEmergencyAccess = useMutation({
    mutationFn: async ({
      id,
      isEmergencyAccessible,
    }: {
      id: number;
      isEmergencyAccessible: boolean;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/health-records/${id}/emergency-access`,
        { isEmergencyAccessible }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records", searchParams] });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<InsertUser>) => {
      const res = await apiRequest("PATCH", "/api/user", data);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema.pick({
        bloodType: true,
        allergies: true,
        gpUsername: true,
        gpName: true,
        gpContact: true,
      })
    ),
    defaultValues: {
      bloodType: user?.bloodType || "",
      allergies: user?.allergies || [],
      gpUsername: user?.gpUsername || "",
      gpName: user?.gpName || "",
      gpContact: user?.gpContact || "",
    },
  });


  const { data: records = [], isLoading, refetch } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await apiRequest(
        "GET",
        `/api/health-records${params.toString() ? `?${params.toString()}` : ""}`
      );
      const data = await response.json();
      logger.debug("Fetched health records", { data });
      return Array.isArray(data) ? data : [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <DashboardWidgets />
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) =>
                    updateProfile.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <p className="text-muted-foreground">{user?.fullName}</p>
                    </div>

                    <FormField
                      control={form.control}
                      name="bloodType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blood Type</FormLabel>
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your blood type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    <FormField
                      control={form.control}
                      name="allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allergies</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Separate allergies with commas"
                              value={field.value?.join(", ") || ""}
                              onChange={(e) => {
                                const allergies = e
                                  .target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                field.onChange(allergies);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Contacts & Healthcare Providers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Emergency Contacts</h3>
                <EmergencyContactsForm
                  contacts={user?.emergencyContacts || []}
                  onSubmit={(contacts) => {
                    updateProfile.mutate({ emergencyContacts: contacts });
                  }}
                  isSubmitting={updateProfile.isPending}
                />
              </div>

              <div className="pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">General Practitioner (GP)</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => updateProfile.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gpUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GP Username</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter GP's username" value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gpName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GP Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter GP's name" value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gpContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GP Contact Information</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="GP's phone number or email" value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateProfile.isPending}>
                        {updateProfile.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save GP Information"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Health Records</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Record
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Health Record</DialogTitle>
                    <DialogDescription>
                      Create a new health record. Fill in all required fields to document your medical information.
                    </DialogDescription>
                  </DialogHeader>
                  <NewRecordForm onSubmit={(data) => createRecord.mutate(data)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <RecordSearch onSearch={(params) => {
                setSearchParams(params);
                refetch();
              }} />
              <Tabs defaultValue="table">
                <TabsList className="mb-4">
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline View</TabsTrigger>
                </TabsList>

                <TabsContent value="table">
                  <div className="max-h-[600px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Facility</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Emergency Access</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records?.map((record) => (
                          <Dialog
                            key={record.id}
                            open={selectedRecord?.id === record.id}
                            onOpenChange={(open) =>
                              !open && setSelectedRecord(null)
                            }
                          >
                            <DialogTrigger asChild>
                              <TableRow
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedRecord(record)}
                              >
                                <TableCell>
                                  {format(new Date(record.date), "PP")}
                                </TableCell>
                                <TableCell>{record.title}</TableCell>
                                <TableCell>{record.facility}</TableCell>
                                <TableCell>{record.recordType}</TableCell>
                                <TableCell>
                                  <div
                                    className="flex items-center space-x-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Switch
                                      id={`emergency-${record.id}`}
                                      checked={record.isEmergencyAccessible ?? false}
                                      onCheckedChange={(checked) =>
                                        toggleEmergencyAccess.mutate({
                                          id: record.id,
                                          isEmergencyAccessible: checked,
                                        })
                                      }
                                    />
                                    <Label htmlFor={`emergency-${record.id}`}>
                                      {record.isEmergencyAccessible
                                        ? "Enabled"
                                        : "Disabled"}
                                    </Label>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </DialogTrigger>
                            {selectedRecord && (
                              <ViewRecordDialog record={selectedRecord} />
                            )}
                          </Dialog>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="timeline">
                  <div className="max-h-[600px] overflow-y-auto">
                    {records && <Timeline records={records} />}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          {user?.emergencyContacts?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Records Shared With You</CardTitle>
              </CardHeader>
              <CardContent>
                <SharedRecordsView />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}