import type { ActionHistoryItem } from "@/app/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTxHistory } from "@/hooks/use-tx-history";

export function ActionHistory({ address, history: initialHistory }: { address?: string, history?: ActionHistoryItem[] }) {
  // If address is provided, fetch history from Etherscan, otherwise use provided history
  const { history: fetchedHistory, isLoading, error } = useTxHistory(address || "");
  
  // Use provided history or fetched history
  const history = initialHistory || fetchedHistory || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>An immutable record of all actions executed from the terminal.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="hidden md:table-cell">Time</TableHead>
                <TableHead className="text-right hidden md:table-cell">Gas Cost</TableHead>
                <TableHead className="text-right">Tx</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                      <span className="text-muted-foreground">Loading transaction history...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="text-destructive">
                      Failed to load transaction history: {error}
                    </div>
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No transaction history found
                  </TableCell>
                </TableRow>
              ) : (
                history.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={item.action === 'Swap' ? 'default' : 'secondary'} className={item.action === 'Swap' ? 'bg-accent/80 text-accent-foreground' : ''}>{item.action}</Badge>
                    </TableCell>
                    <TableCell>{item.details}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground hidden md:table-cell">{item.gasCost.toFixed(4)} ETH</TableCell>
                    <TableCell className="text-right">
                      <a href={`https://etherscan.io/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                        <ExternalLink className="size-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
