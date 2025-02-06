import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SharedAccess } from "@shared/schema";

const shareSchema = z.object({
  username: z.string().min(1, "Username is required"),
  accessLevel: z.enum(["view", "emergency"]),
});

type ShareFormData = z.infer<typeof shareSchema>;

interface RecordSharingFormProps {
  recordId: number;
  sharedWith: SharedAccess[];
}

export function RecordSharingForm({ recordId, sharedWith }: RecordSharingFormProps) {
  const { toast } = useToast();
  const form = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      username: "",
      accessLevel: "view",
    },
  });

  const shareRecord = useMutation({
    mutationFn: async (data: ShareFormData) => {
      const res = await apiRequest(
        "PUT",
        `/api/health-records/${recordId}/share`,
        {
          username: data.username,
          accessLevel: data.accessLevel,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      toast({
        title: "Record shared",
        description: "The record has been shared successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error sharing record",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeAccess = useMutation({
    mutationFn: async (username: string) => {
      const res = await apiRequest(
        "DELETE",
        `/api/health-records/${recordId}/share/${username}`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      toast({
        title: "Access revoked",
        description: "Access has been revoked successfully.",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => shareRecord.mutate(data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Level</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="emergency">Emergency Access</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={shareRecord.isPending}
          >
            {shareRecord.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              "Share Record"
            )}
          </Button>
        </form>
      </Form>

      {sharedWith.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">Shared With</h4>
          <div className="space-y-2">
            {sharedWith.map((share) => (
              <div
                key={share.username}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{share.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Access Level: {share.accessLevel}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeAccess.mutate(share.username)}
                  disabled={revokeAccess.isPending}
                >
                  {revokeAccess.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Revoke"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
