import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ComplexSuite } from "@/components/calculator/complex-suite";
import { FunctionSquare, Compass } from "lucide-react";

export default function ComplexPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <PageHeader
        title="Complex Numbers & Phasor Calculator"
        description="Comprehensive complex-number CAS engine with Argand plane visualizer, De Moivre roots, and AC phasor analysis"
        icon={<Compass size={22} className="text-accent-purple" />}
        iconColor="purple"
        status="available"
      />

      <ComplexSuite />
    </div>
  );
}
