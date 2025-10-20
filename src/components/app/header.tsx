
"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, User, ChevronDown } from "lucide-react";
import { Logo } from "./logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole, useIsRegisteredLeader } from "@/context/RoleContext";
import { useAccount } from "wagmi";
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

    const { address } = useAccount();
    const { isRegistered, isLoading } = useIsRegisteredLeader(address);
    const role = isRegistered ? 'leader' : 'follower';
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
            <Button variant="ghost" className="flex items-center gap-1" disabled={isLoading}>
                <span className="capitalize">{isLoading ? 'Loading...' : role}</span>
            </Button>

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
