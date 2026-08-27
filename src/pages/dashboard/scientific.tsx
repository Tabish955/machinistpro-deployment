import { PremiumCalculator } from "@/components/calculator/premium-calculator";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function ScientificCalculatorPage() {
  return (
    <ErrorBoundary fallbackTitle="Calculator Suite could not load">
      <PremiumCalculator />
    </ErrorBoundary>
  );
}
