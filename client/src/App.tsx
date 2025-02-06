import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SharedRecords from "@/pages/shared-records";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { BootSequence } from "@/components/boot-sequence";

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Switch key={location}>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/shared" component={SharedRecords} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  const [showBootSequence, setShowBootSequence] = useState(true);
  const [hasBooted, setHasBooted] = useState(false);

  // Only show boot sequence on first load
  useEffect(() => {
    const hasBootedBefore = sessionStorage.getItem('hasBooted');
    if (hasBootedBefore) {
      setShowBootSequence(false);
      setHasBooted(true);
    } else {
      sessionStorage.setItem('hasBooted', 'true');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {showBootSequence && !hasBooted ? (
          <BootSequence onComplete={() => {
            setShowBootSequence(false);
            setHasBooted(true);
          }} />
        ) : (
          <>
            <Router />
            <Toaster />
          </>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;