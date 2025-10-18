
"use client";

import type { Leader } from "@/app/lib/types";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowDownUp, SlidersHorizontal, ArrowUp, ArrowDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useRole } from "@/context/RoleContext";


const TraderCard = ({ leader }: { leader: Leader }) => (
    <Link href={`/leader/${leader.id}`} className="block">
      <Card className="hover:bg-card/80 transition-colors bg-gradient-to-br from-white/5 to-white/0 border-white/10 rounded-xl overflow-hidden">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={leader.avatar.imageUrl} alt={leader.name} data-ai-hint={leader.avatar.imageHint} />
                  <AvatarFallback>{leader.name.charAt(0)}</AvatarFallback>
                </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-lg">{leader.name}</span>
              </div>
            </div>
            <Button size="sm" className="rounded-full px-6 text-sm">
                View
            </Button>
          </div>
  
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 text-sm">
            <div>
                <p className="text-xs text-muted-foreground">30d Net APY</p>
                <p className={`font-semibold ${leader.apy30d > 0 ? 'text-green-400' : 'text-red-400'}`}>{leader.apy30d > 0 ? '+' : ''}{leader.apy30d.toFixed(2)}%</p>
            </div>
             <div>
                <p className="text-xs text-muted-foreground">Total Fees Earned</p>
                <p className="font-semibold">${leader.totalFees.toLocaleString()}</p>
            </div>
             <div>
                <p className="text-xs text-muted-foreground">TVL</p>
                <p className="font-semibold">${(leader.tvl / 1000000).toFixed(2)}m</p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">Followers</p>
                <p className="font-semibold">{leader.followers.toLocaleString()}</p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">Risk Score</p>
                <p className="font-semibold">{leader.riskScore}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

type SortKey = 'apy30d' | 'totalFees' | 'tvl' | 'followers';
type SortDirection = 'asc' | 'desc';
type RiskFilter = 'All' | 'Low' | 'Medium' | 'High';

export function AllTraders({ leaders }: { leaders: Leader[] }) {
    const { role } = useRole();
    const [sortKey, setSortKey] = useState<SortKey>('apy30d');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('All');
    
    const sortedAndFilteredLeaders = useMemo(() => {
        let filtered = [...leaders];

        if (riskFilter !== 'All') {
            filtered = filtered.filter(leader => leader.riskScore === riskFilter);
        }

        return filtered.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [leaders, sortKey, sortDirection, riskFilter]);

    const handleSortChange = (key: SortKey) => {
        if (key === sortKey) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('desc');
        }
    }

    const sortOptions: { key: SortKey, label: string }[] = [
        { key: 'apy30d', label: "30d Net APY" },
        { key: 'totalFees', label: "Total Fees Earned" },
        { key: 'tvl', label: "TVL" },
        { key: 'followers', label: "Followers" },
    ];

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex justify-between items-center gap-2">
                {role === 'follower' && (
                    <Button asChild>
                        <Link href="/register">Become a Trader</Link>
                    </Button>
                )}
                <div className={cn("flex items-center gap-2", role === 'leader' && "w-full justify-end")}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                                <ArrowDownUp className="size-4" />
                                Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {sortOptions.map(option => (
                                <DropdownMenuRadioItem 
                                    key={option.key} 
                                    value={option.key}
                                    className="flex justify-between"
                                    onClick={() => handleSortChange(option.key)}
                                >
                                    {option.label}
                                    {sortKey === option.key && (
                                        sortDirection === 'desc' ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />
                                    )}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                                <SlidersHorizontal className="size-4" />
                                Filter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Filter by Risk</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={riskFilter} onValueChange={(value) => setRiskFilter(value as RiskFilter)}>
                                <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Low">Low</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="Medium">Medium</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="High">High</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div className="grid gap-4">
                {sortedAndFilteredLeaders.map((leader) => (
                    <TraderCard key={leader.id} leader={leader} />
                ))}
                 {sortedAndFilteredLeaders.length === 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        No traders match the selected filters.
                    </div>
                )}
            </div>
        </div>
    );
}
