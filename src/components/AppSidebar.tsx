import {
  LayoutDashboard,
  Users,
  Building2,
  DollarSign,
  FileText,
  Briefcase,
  BarChart3,
  Shield,
  LogOut,
  CreditCard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "C.A.V", url: "/", icon: LayoutDashboard, emoji: "📊" },
  { title: "Funcionários", url: "/funcionarios", icon: Users, emoji: "👥" },
  { title: "Clientes", url: "/clientes", icon: Building2, emoji: "🏢" },
  { title: "Recebíveis", url: "/recebiveis", icon: DollarSign, emoji: "💰" },
  { title: "Vales", url: "/vales", icon: FileText, emoji: "📋" },
  { title: "Folha de Pagamento", url: "/folha", icon: Briefcase, emoji: "💼" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, emoji: "📈" },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: CreditCard, emoji: "💳" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin, user, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <span className="text-lg font-bold text-sidebar-primary-foreground">
              ​Bem Vindo
            </span>
          </div>
        )}
        {collapsed && <span className="text-2xl mx-auto">🏢</span>}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <span className="mr-2 text-base">{item.emoji}</span>
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/usuarios"
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <span className="mr-2 text-base">🔐</span>
                      {!collapsed && <span>Usuários</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground/50 truncate">
            {user.email}
          </p>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut size={16} />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
