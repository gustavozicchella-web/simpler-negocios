import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Funcionarios from "./pages/Funcionarios";
import Clientes from "./pages/Clientes";
import Recebiveis from "./pages/Recebiveis";
import Vales from "./pages/Vales";
import FolhaPagamento from "./pages/FolhaPagamento";
import Relatorios from "./pages/Relatorios";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/funcionarios" element={<Funcionarios />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/recebiveis" element={<Recebiveis />} />
            <Route path="/vales" element={<Vales />} />
            <Route path="/folha" element={<FolhaPagamento />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
