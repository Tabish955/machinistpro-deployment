
import { useEffect } from "react";
import { useRouter } from "@/lib/next-compat";

export default function PricingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/weight");
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-gray-500">Redirecting to Material Weight & Cost…</p>
    </div>
  );
}
