import type { ActionHistoryItem } from "@/app/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ActionHistory({ history }: { history: ActionHistoryItem[] }) {
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
              {history.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={item.action === 'Swap' ? 'default' : 'secondary'} className={item.action === 'Swap' ? 'bg-accent/80 text-accent-foreground' : ''}>{item.action}</Badge>
                  </TableCell>
                  <TableCell>{item.details}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground hidden md:table-cell">{item.gasCost.toFixed(4)} ETH</TableCell>
                  <TableCell className="text-right">
                    <a href={`https://basescan.org/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                      <ExternalLink className="size-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
