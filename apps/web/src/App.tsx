import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useOutlet } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Features from "./pages/Features";
import Docs from "./pages/Docs";
import Security from "./pages/Security";
import Roadmap from "./pages/Roadmap";
import Playground from "./pages/Playground";
import ViewNote from "./pages/ViewNote";
import NotFound from "./pages/NotFound";
import EncatchFeedback from "./components/EncatchFeedback";

const queryClient = new QueryClient();

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

function AnimatedLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} {...pageTransition}>
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => (
  <BrowserRouter>
    <ScrollToTop />
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <EncatchFeedback/>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<AnimatedLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/features" element={<Features />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/pricing" element={<Navigate to="/" replace />} />
              <Route path="/security" element={<Security />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/playground" element={<Playground />} />
              <Route path="/s/:slug" element={<ViewNote />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
