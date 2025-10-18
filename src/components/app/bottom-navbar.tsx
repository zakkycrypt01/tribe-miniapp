
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuItems } from "./sidebar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/context/RoleContext";
import { Terminal } from "lucide-react";

export function BottomNavbar() {
  const pathname = usePathname();
  const { role } = useRole();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur-sm md:hidden rounded-t-xl">
      <div className="grid h-16 grid-cols-2">
        {menuItems.map((item) => {
          const isPortfolio = item.href === '/portfolio';
          const label = isPortfolio ? (role === 'leader' ? 'Terminal' : 'Portfolio') : item.label;
          const isActive = pathname === item.href;
          let Icon = isActive ? item.activeIcon : item.icon;

          if (isPortfolio && role === 'leader') {
            Icon = Terminal;
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 p-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/80"
              )}
            >
              <div className="relative">
                <Icon className={cn("size-6 transition-all", isActive ? 'size-7' : 'size-6')} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-primary"></span>
                )}
              </div>
              <span className={cn("text-xs transition-opacity", isActive ? 'opacity-100 text-white' : 'opacity-0')}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
