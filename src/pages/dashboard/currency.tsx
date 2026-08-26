import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CurrencySuite } from "@/components/currency/currency-suite";
import { Coins } from "lucide-react";

export default function CurrencyPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <PageHeader
        title="Currency & Forex Exchange Rates"
        description="Real-time multi-currency converter, interactive historical trends, and OANDA-style institutional market rates"
        icon={<Coins size={22} className="text-accent-amber" />}
        iconColor="amber"
        status="available"
      />

      <CurrencySuite />
    </div>
  );
}
