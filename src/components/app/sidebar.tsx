
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Compass, LayoutGridIcon, Terminal } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "../ui/badge";
import { useRole } from "@/context/RoleContext";

export const menuItems = [
   {
    href: "/",
    label: "Discovery",
    icon: Compass,
    activeIcon: Compass,
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: LayoutGridIcon,
    activeIcon: LayoutGrid,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { role } = useRole();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <img src='https://i.postimg.cc/9wYkyYDx/Tribe-Logo-Edit.png' style={{ height: '20px' }} alt='Tribe-Logo-Edit'/>
          <div className="flex-1" />
          <SidebarTrigger className="hidden md:flex" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const isPortfolio = item.href === '/portfolio';
            let label = isPortfolio ? (role === 'leader' ? 'Terminal' : 'Portfolio') : item.label;
            let Icon = item.icon;
            let ActiveIcon = item.activeIcon

            if (isPortfolio && role === 'leader') {
              Icon = Terminal;
              ActiveIcon = Terminal;
            }

            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{
                    children: label,
                  }}
                >
                  <Link href={item.href}>
                    {isActive ? <ActiveIcon /> : <Icon />}
                    <span>{label}</span>
                    {item.isNew && <Badge className="ml-auto">New</Badge>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Can add elements to footer here */}
      </SidebarFooter>
    </Sidebar>
  );
}
