
"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, User, ChevronDown } from "lucide-react";
import { Logo } from "./logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";


const HeaderTitle = () => {
    const { role } = useRole();
    const pathname = usePathname();

    if (pathname.startsWith('/leader/')) {
        return "Leader Profile"
    }
    if (pathname.startsWith('/discovery')) {
        return "Copy Trading"
    }
     if (pathname.startsWith('/pools/')) {
        return ""
    }
    if (pathname.startsWith('/profile')) {
        return "My Profile"
    }
    if (pathname === '/portfolio') {
        return role === 'follower' ? "Investor Center" : "Leader Terminal"
    }
     if (pathname.startsWith('/register')) {
        return "Become a Lead Trader"
    }
    if (pathname === '/') {
        return "Copy Trading"
    }
    return "Tribe Pool"
}


export function AppHeader() {
  const { role, setRole } = useRole();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-b-border/50 bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <div className="md:hidden">
            <img src='https://i.postimg.cc/9wYkyYDx/Tribe-Logo-Edit.png' style={{ width: '80px' }} alt='Tribe-Logo-Edit'/>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <img src='https://i.postimg.cc/9wYkyYDx/Tribe-Logo-Edit.png' style={{ height: '20px' }} alt='Tribe-Logo-Edit'/>
        </div>
      </div>
       <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold">
           <HeaderTitle />
        </div>
        {isClient ? (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-1">
                        <span className="capitalize">{role}</span>
                        <ChevronDown className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={role} onValueChange={(value) => setRole(value as 'follower' | 'leader')}>
                        <DropdownMenuRadioItem value="follower">Follower</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="leader">Lead Trader</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {role === 'leader' && (
              <Button variant="ghost" size="icon" asChild>
                  <Link href="/profile">
                  <User className="size-5" />
                  </Link>
              </Button>
            )}
        </div>
      ) : null}
    </header>
  );
}
