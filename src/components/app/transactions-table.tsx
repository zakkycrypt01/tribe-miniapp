
"use client";

import type { PoolTransaction } from "@/app/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function formatCurrency(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
}

export function TransactionsTable({ transactions }: { transactions: PoolTransaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="hidden md:table-cell text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Badge variant={item.type === 'Swap' ? 'default' : 'secondary'} className={item.type === 'Swap' ? 'bg-accent/80 text-accent-foreground' : ''}>{item.type}</Badge>
                        <span className="hidden md:inline">{item.details}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(item.value)}</TableCell>
                  <TableCell className="font-mono">
                    <a href={`https://basescan.org/address/${item.account}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline gap-1">
                        {item.account}
                        <ExternalLink className="size-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell text-right">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
