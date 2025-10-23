import type { ActionHistoryItem } from "@/app/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTxHistory } from "@/hooks/use-tx-history";

export function ActionHistory({ address }: { address: string }) {
  // Fetch transaction history from Etherscan API
  const { history, isLoading, error, rawData } = useTxHistory(address);
  
  // Log the number of transactions we're displaying
  console.log(`Displaying ${history.length} transactions in ActionHistory table from API`);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <Badge variant="outline">{history.length} Transactions</Badge>
          </div>
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
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Badge 
                        variant={
                          item.action === 'Swap' ? 'default' : 
                          item.action === 'Add Liquidity' ? 'outline' : 
                          item.action === 'Remove Liquidity' ? 'secondary' : 'destructive'
                        } 
                        className={
                          item.action === 'Swap' ? 'bg-accent/80 text-accent-foreground' : 
                          item.action === 'Add Liquidity' ? 'bg-green-100 text-green-800 border-green-300' :
                          item.action === 'Remove Liquidity' ? 'bg-amber-100 text-amber-800 border-amber-300' : ''
                        }
                      >
                        {item.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.details}>
                      {item.details}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">
                      <span title={item.timestamp.toLocaleString()}>
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground hidden md:table-cell">
                      <span title={`Gas cost: ${item.gasCost} ETH`}>
                        {item.gasCost ? item.gasCost.toFixed(6) : '0.000000'} ETH
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <a 
                        href={`https://sepolia.basescan.org/tx/${item.txHash}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-primary hover:underline"
                        title="View transaction on Base Goerli Explorer"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-xs text-muted-foreground flex items-center justify-between">
          <div>
            {!isLoading && history.length > 0 && (
              <span>Showing {history.length} most recent transactions</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <a 
              href="https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Etherscan API
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
