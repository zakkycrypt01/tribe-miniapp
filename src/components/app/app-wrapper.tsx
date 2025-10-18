
"use client";

import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/sidebar';
import { AppHeader } from '@/components/app/header';
import { BottomNavbar } from '@/components/app/bottom-navbar';
import { RoleProvider } from '@/context/RoleContext';
import { LoadingScreen } from './loading';

export function AppWrapper({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000); 

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <RoleProvider>
            <SidebarProvider>
                <AppSidebar />
                <div className="flex flex-1">
                    <SidebarInset>
                        <AppHeader />
                        <main className="flex-1 pb-20 md:pb-0">{children}</main>
                    </SidebarInset>
                </div>
                <BottomNavbar />
            </SidebarProvider>
        </RoleProvider>
    );
}
