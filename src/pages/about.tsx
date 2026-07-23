
import { InfoPage } from "@/components/layout/info-page";
import { Calculator, Shield, Zap, Globe, Wrench, BookOpen } from "lucide-react";

export default function AboutPage() {
  return (
    <InfoPage title="About MachinistPro">
      <p className="text-base text-gray-300">
        MachinistPro is a premium engineering calculator suite built for professionals who demand precision, speed, and reliability in their daily work.
      </p>

      <h2 className="text-xl font-semibold text-white pt-4">Our Mission</h2>
      <p>
        We believe every machinist, engineer, and technical professional deserves access to world-class calculation tools without complexity, subscription fatigue, or internet dependency. MachinistPro puts hundreds of engineering tools in your pocket — always available, always accurate.
      </p>

      <h2 className="text-xl font-semibold text-white pt-4">What We Offer</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {[
          { icon: Calculator, title: "9 Calculator Modules", desc: "Scientific, unit converter, material weight, machining, geometry, engineering, industrial, and more." },
          { icon: BookOpen, title: "600+ Data Points", desc: "Formulas, constants, materials, threads, drills, and cutting data — all built-in." },
          { icon: Shield, title: "Offline-First", desc: "All tools work without internet. Your data stays on your device." },
          { icon: Zap, title: "Instant Results", desc: "Live calculations update as you type. No waiting, no loading." },
          { icon: Wrench, title: "Built for Professionals", desc: "Designed by engineers, for engineers. Industry-standard formulas and data." },
          { icon: Globe, title: "Metric & Imperial", desc: "Full support for both unit systems across all calculators." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="p-4 rounded-xl border border-dark-600 bg-dark-800/40">
              <Icon size={20} className="text-accent-cyan mb-2" />
              <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          );
        })}
      </div>

      <h2 className="text-xl font-semibold text-white pt-4">Who Is It For?</h2>
      <ul className="list-disc list-inside space-y-1 text-gray-400">
        <li>CNC machinists and operators</li>
        <li>Fabrication shops and workshops</li>
        <li>Mechanical and manufacturing engineers</li>
        <li>Quality inspectors and metrology professionals</li>
        <li>Engineering students and educators</li>
        <li>Plant maintenance and industrial engineers</li>
      </ul>

      <h2 className="text-xl font-semibold text-white pt-4">Version</h2>
      <p>MachinistPro v1.0.0-rc1 — Precision Engineering Tools</p>
      <p className="text-xs text-gray-600 mt-2">© 2025 MachinistPro. All rights reserved.</p>
    </InfoPage>
  );
}
