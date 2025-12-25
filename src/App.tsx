import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import LocalSpend from "./pages/LocalSpend";
import Services from "./pages/Services";
import Hearings from "./pages/Hearings";
import Projects from "./pages/Projects";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/local-spend" element={<LocalSpend />} />
          <Route path="/services" element={<Services />} />
          <Route path="/service/:id" element={<Services />} />
          <Route path="/hearings" element={<Hearings />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<Projects />} />
          <Route path="/permit/:id" element={<Projects />} />
          <Route path="/money" element={<LocalSpend />} />
          <Route path="/indicators/:id" element={<Projects />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
