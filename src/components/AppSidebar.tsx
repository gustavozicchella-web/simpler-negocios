import {
  LayoutDashboard,
  Users,
  Building2,
  DollarSign,
  FileText,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard, emoji: "📊" },
  { title: "Funcionários", url: "/funcionarios", icon: Users, emoji: "👥" },
  { title: "Clientes", url: "/clientes", icon: Building2, emoji: "🏢" },
  { title: "Recebíveis", url: "/recebiveis", icon: DollarSign, emoji: "💰" },
  { title: "Vales", url: "/vales", icon: FileText, emoji: "📋" },
  { title: "Folha de Pagamento", url: "/folha", icon: Briefcase, emoji: "💼" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, emoji: "📈" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            <span className="text-lg font-bold text-sidebar-primary-foreground">
              Gestor Empresa
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/50">
            Gestor Empresa v1.0
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
