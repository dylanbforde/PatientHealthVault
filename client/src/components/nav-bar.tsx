import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LogOut, Layout, FileText } from "lucide-react";
import { LogoText } from "@/components/ui/logo";

export function NavBar() {
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <LogoText />
          </Link>
          <nav className="flex gap-6">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Layout className="h-4 w-4" />
              Dashboard
            </Link>
            <Link 
              href="/shared" 
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <FileText className="h-4 w-4" />
              Shared Records
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.username}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}