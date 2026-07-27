import Link from "next/link";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBilling } from "@/lib/data/billing";
import { formatCents, formatDate } from "@/lib/utils";

export default async function BillingPage() {
  const billing = await getBilling();
  const usagePct = Math.min(100, Math.round((billing.leadsProcessedThisCycle / billing.leadsIncluded) * 100));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Billing</h1>
        <p className="text-sm text-slate-500">Your plan, usage this cycle, and past invoices.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{billing.planName} plan</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/pricing">Change plan</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              {billing.leadsProcessedThisCycle.toLocaleString()} / {billing.leadsIncluded.toLocaleString()} leads used
            </span>
            <span>Renews {formatDate(billing.cycleEndsAt)}</span>
          </div>
          <Progress value={usagePct} className="mt-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {billing.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>{formatCents(invoice.amountCents)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === "paid" ? "qualified" : "neutral"}>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <a href={invoice.pdfUrl} className="inline-flex items-center gap-1 text-sm text-signal-600 hover:underline">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
