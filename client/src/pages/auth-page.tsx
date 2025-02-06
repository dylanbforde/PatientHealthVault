import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left column with auth forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Tabs defaultValue="login" className="w-full max-w-md">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
              </CardHeader>
              <CardContent>
                <RegisterForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right column with info */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-lg text-primary-foreground">
          <h1 className="text-4xl font-bold mb-6">Your Health Data, Your Control</h1>
          <div className="space-y-4">
            <p className="text-lg">
              Take control of your medical history with our privacy-focused platform:
            </p>
            <ul className="list-disc list-inside space-y-2 opacity-90">
              <li>Securely store and manage your health records</li>
              <li>Share specific records with healthcare providers</li>
              <li>Access your medical history anytime, anywhere</li>
              <li>Enable emergency access for critical situations</li>
              <li>Keep track of allergies and important health information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" {...register("username")} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Login
        </Button>
      </div>
    </form>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      bloodType: "",
      allergies: [],
      emergencyContact: "",
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="register-username">Username</Label>
          <Input id="register-username" {...register("username")} />
        </div>
        <div>
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            {...register("password")}
          />
        </div>
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" {...register("fullName")} />
        </div>
        <div>
          <Label htmlFor="bloodType">Blood Type (optional)</Label>
          <Input id="bloodType" {...register("bloodType")} />
        </div>
        <div>
          <Label htmlFor="emergencyContact">Emergency Contact (optional)</Label>
          <Input id="emergencyContact" {...register("emergencyContact")} />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Register
        </Button>
      </div>
    </form>
  );
}