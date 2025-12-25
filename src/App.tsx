import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load pages for better bundle splitting
const LocalSpend = lazy(() => import("./pages/LocalSpend"));
const Services = lazy(() => import("./pages/Services"));
const Hearings = lazy(() => import("./pages/Hearings"));
const Projects = lazy(() => import("./pages/Projects"));
const Sources = lazy(() => import("./pages/Sources"));

const queryClient = new QueryClient();

// Loading fallback for lazy-loaded pages
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/local-spend" element={<LocalSpend />} />
            <Route path="/money" element={<LocalSpend />} />
            <Route path="/services" element={<Services />} />
            <Route path="/service/:id" element={<Services />} />
            <Route path="/hearings" element={<Hearings />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:id" element={<Projects />} />
            <Route path="/sources" element={<Sources />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
