"use client";

import dynamic from "next/dynamic";
import { APP_NAME } from "~/lib/constants";
import { Leaderboard } from "@/components/app/leaderboard";
import { AllTraders } from "@/components/app/all-traders";
import { getLeaders, getTokens } from "@/app/lib/mock-data";
import { useState } from "react";
import { cn } from "@/lib/utils";

// note: dynamic import is required for components that use the Frame SDK
const AppComponent = dynamic(() => import("~/components/App"), {
  ssr: false,
});

export default function Discovery(
  { title }: { title?: string } = { title: APP_NAME }
) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'all-traders'>('leaderboard');
  const leaders = getLeaders();
  const tokens = getTokens();

  const handleSetActiveTab = (tab: string) => {
    if (tab === 'leaderboard' || tab === 'all-traders') {
      setActiveTab(tab);
    }
  };

  return (
    <>
      <AppComponent title={title} />
      <main className="flex flex-1 flex-col">
        <div className="flex justify-between items-center text-sm font-medium border-b border-border text-muted-foreground">
          <div className="flex items-center gap-6 px-4">
            <button onClick={() => setActiveTab('leaderboard')} className={cn("border-b-2 pb-2", activeTab === 'leaderboard' ? "text-foreground border-white" : "border-transparent")}>Leaderboard</button>
            <button onClick={() => setActiveTab('all-traders')} className={cn("border-b-2 pb-2", activeTab === 'all-traders' ? "text-foreground border-white" : "border-transparent")}>All Traders</button>
          </div>
        </div>

        {activeTab === 'leaderboard' && <Leaderboard leaders={leaders} tokens={tokens} setActiveTab={handleSetActiveTab} />}
        {activeTab === 'all-traders' && <AllTraders leaders={leaders} />}
      </main>
    </>
  );
}
