
"use client";

import type { Leader, Token } from "@/app/lib/types";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowRight, Crown, HelpCircle, Users } from "lucide-react";

const LeaderCard = ({ leader }: { leader: Leader }) => (
  <Link href={`/leader/${encodeURIComponent(leader.walletAddress)}`} className="block">
    <Card className="hover:bg-card/80 transition-colors bg-gradient-to-br from-white/5 to-white/0 border-white/10 rounded-xl overflow-hidden">
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-primary/50">
                <AvatarImage src={leader.avatar.imageUrl} alt={leader.name} data-ai-hint={leader.avatar.imageHint} />
                <AvatarFallback>{leader.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Crown className="absolute -top-2 -left-2 size-5 text-golden fill-golden -rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg">{leader.name}</span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="size-3" />
                <span>{leader.followerCount}/{leader.maxFollowers}</span>
              </div>
            </div>
          </div>
          <Button size="sm" className="rounded-full px-6 text-sm">
              View
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 flex flex-col gap-2">
              <div>
                  <p className="text-xs text-muted-foreground">30d Net APY</p>
                  <p className="font-semibold text-xl text-green-400">+{leader.apy30d.toFixed(2)}%</p>
              </div>
               <div>
                  <p className="text-xs text-muted-foreground">Total Fees Earned</p>
                  <p className="font-semibold text-base">${leader.totalFees.toLocaleString()}</p>
              </div>
               <div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                  <p className="font-semibold text-base">{leader.riskScore}</p>
              </div>
          </div>
          <div className="col-span-1 relative">
             <div className="h-20 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={leader.historicalApy} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="apy"
                      type="natural"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#chart-gradient)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);


export function Leaderboard({ leaders, tokens, setActiveTab }: { leaders: Leader[], tokens: Token[], setActiveTab: (tab: string) => void }) {

  const filterChips = ["Top Lower Profit", "Top Balanced Traders", "Top New Talent"];
  const [activeFilter, setActiveFilter] = useState("Top Balanced Traders");

  const filteredLeaders = useMemo(() => {
    const sortedLeaders = [...leaders];
    switch (activeFilter) {
      case "Top Lower Profit":
        return sortedLeaders.sort((a, b) => a.apy30d - b.apy30d).slice(0,3);
      case "Top Balanced Traders":
        // Sort by Sharpe Ratio for "Balanced"
        return sortedLeaders.sort((a, b) => b.sharpeRatio - a.sharpeRatio).slice(0,3);
      case "Top New Talent":
         // Sort by followers for "New Talent"
        return sortedLeaders.sort((a, b) => a.followerCount - b.followerCount).slice(0,3);
      default:
        return sortedLeaders.slice(0,3);
    }
  }, [leaders, activeFilter]);

  return (
    <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 overflow-x-auto flex-nowrap">
          {filterChips.map(chip => (
            <Button 
              key={chip}
              variant={activeFilter === chip ? 'secondary': 'ghost'}
              size="xs"
              className="whitespace-nowrap rounded-full"
              onClick={() => setActiveFilter(chip)}
            >
              {chip}
            </Button>
          ))}
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <p>Traders that balance profit and risk.</p>
            <HelpCircle className="size-4" />
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setActiveTab('all-traders')}>
            View All <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>

      <div className="grid gap-4">
        {filteredLeaders.map((leader) => (
          <LeaderCard key={leader.id} leader={leader} />
        ))}
      </div>
    </div>
  );
}
