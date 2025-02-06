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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type HealthRecord, insertHealthRecordSchema } from "@shared/schema";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function NewRecordForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const form = useForm({
    resolver: zodResolver(insertHealthRecordSchema.omit({ userId: true })),
    defaultValues: {
      title: "",
      date: new Date(),
      recordType: "",
      facility: "",
      content: { notes: "" },
      isEmergencyAccessible: false,
      sharedWith: [],
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        try {
          console.log('Form data before submission:', data);
          // Ensure date is a Date object
          const formattedData = {
            ...data,
            date: data.date instanceof Date ? data.date : new Date(data.date),
          };
          console.log('Formatted data:', formattedData);
          onSubmit(formattedData);
        } catch (error) {
          console.error('Form submission error:', error);
          if (form.formState.errors) {
            console.log('Form validation errors:', form.formState.errors);
          }
        }
      })} className="space-y-4">
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
                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    date.setHours(12); // Set to noon to avoid timezone issues
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
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Record Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter record details"
                  value={field.value.notes || ""}
                  onChange={(e) => field.onChange({ notes: e.target.value })}
                />
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
            'Create Record'
          )}
        </Button>

        {/* Display any form-level errors */}
        {Object.keys(form.formState.errors).length > 0 && (
          <div className="text-sm text-red-500 mt-2">
            Please fix the errors above and try again.
          </div>
        )}
      </form>
    </Form>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: records, isLoading } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  const createRecord = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log('Sending record data to server:', data);
        const res = await apiRequest("POST", "/api/health-records", data);
        if (!res.ok) {
          const errorData = await res.json();
          console.error('Server response error:', errorData);
          throw new Error(errorData.message || 'Failed to create record');
        }
        const responseData = await res.json();
        console.log('Server response success:', responseData);
        return responseData;
      } catch (error) {
        console.error('Record creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      toast({
        title: "Record created",
        description: "Your health record has been created successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      toast({
        title: "Error creating record",
        description: error.message || "Failed to create health record",
        variant: "destructive",
      });
    },
  });

  const toggleEmergencyAccess = useMutation({
    mutationFn: async ({ id, isEmergencyAccessible }: { id: number; isEmergencyAccessible: boolean }) => {
      const res = await apiRequest(
        "PUT",
        `/api/health-records/${id}/emergency-access`,
        { isEmergencyAccessible }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Health Records Dashboard</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="font-medium">Full Name</dt>
                  <dd className="text-muted-foreground">{user?.fullName}</dd>
                </div>
                <div>
                  <dt className="font-medium">Blood Type</dt>
                  <dd className="text-muted-foreground">
                    {user?.bloodType || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Emergency Contact</dt>
                  <dd className="text-muted-foreground">
                    {user?.emergencyContact || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Allergies</dt>
                  <dd className="text-muted-foreground">
                    {user?.allergies?.length
                      ? user.allergies.join(", ")
                      : "None specified"}
                  </dd>
                </div>
              </dl>
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
                  </DialogHeader>
                  <NewRecordForm onSubmit={(data) => createRecord.mutate(data)} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
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
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.date), "PP")}
                      </TableCell>
                      <TableCell>{record.title}</TableCell>
                      <TableCell>{record.facility}</TableCell>
                      <TableCell>{record.recordType}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
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
                            {record.isEmergencyAccessible ? "Enabled" : "Disabled"}
                          </Label>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}