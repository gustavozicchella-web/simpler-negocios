import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Funcionarios from "./pages/Funcionarios";
import Clientes from "./pages/Clientes";
import Recebiveis from "./pages/Recebiveis";
import Vales from "./pages/Vales";
import FolhaPagamento from "./pages/FolhaPagamento";
import Relatorios from "./pages/Relatorios";
import AdminUsuarios from "./pages/AdminUsuarios";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading, isActive, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Acesso Desativado</h2>
          <p className="text-muted-foreground">Sua conta foi desativada pelo administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/recebiveis" element={<Recebiveis />} />
        <Route path="/vales" element={<Vales />} />
        <Route path="/folha" element={<FolhaPagamento />} />
        <Route path="/relatorios" element={<Relatorios />} />
        {isAdmin && <Route path="/admin/usuarios" element={<AdminUsuarios />} />}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
