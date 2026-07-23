
import { useState } from "react";
import { InfoPage } from "@/components/layout/info-page";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "What is MachinistPro?", a: "MachinistPro is a premium, offline-first engineering calculator suite designed for machinists, CNC operators, fabrication shops, mechanical engineers, and technical students. It includes scientific calculations, unit conversion, material weight estimation, machining tools, geometry, engineering analysis, and more." },
  { q: "Do I need an internet connection to use MachinistPro?", a: "No. All calculators, formulas, material databases, and reference data work completely offline after you log in. The only feature that requires internet is the initial login authentication." },
  { q: "What calculators are included?", a: "MachinistPro includes: Scientific Calculator, Universal Unit Converter (180+ units), Material Weight & Cost Estimator, Machining Calculator (RPM, feeds, threads), Geometry Calculator (30 shapes), Engineering Calculator (stress, beams, springs, fasteners), Industrial Suite (sheet metal, welding, hydraulics, gears), Formula Library, Engineering Database, and Tolerances & GD&T reference." },
  { q: "Is my data stored on your servers?", a: "No. MachinistPro uses an offline-first architecture. All your calculations, projects, history, favorites, and settings are stored locally on your device using browser local storage. We do not store any of your engineering data on our servers." },
  { q: "Can I back up my data?", a: "Yes. Go to Settings → Export Backup to download a JSON file containing all your local data. You can restore from this backup at any time using Settings → Import Backup." },
  { q: "How accurate are the calculations?", a: "All formulas are based on established engineering standards and reference data. The scientific calculator uses IEEE 754 double-precision floating point with up to 15 significant digits. Material densities, thread data, and cutting parameters are sourced from industry reference handbooks." },
  { q: "What thread standards are supported?", a: "The thread database includes ISO Metric, UNC, UNF, NPT, BSP, and ACME threads with major diameter, minor diameter, pitch, TPI, tap drill size, and clearance drill size for each entry." },
  { q: "Can I use MachinistPro on my phone?", a: "Yes. MachinistPro is fully responsive and works on phones, tablets, and desktops. The interface automatically adapts to your screen size." },
  { q: "What materials are in the database?", a: "The material database includes 34 materials: 9 steels, 7 aluminum alloys, 3 copper alloys, 6 specialty metals (titanium, inconel, monel, etc.), and 8 engineering plastics. Each includes density, strength, hardness, thermal conductivity, and more." },
  { q: "How do I contact support?", a: "Visit the Contact page or email support@machinistpro.com. We typically respond within 24 hours." },
  { q: "Can I use MachinistPro for commercial work?", a: "Yes. MachinistPro is designed for professional use in workshops, factories, engineering offices, and educational institutions. However, always verify critical calculations independently as per good engineering practice." },
  { q: "What keyboard shortcuts are available?", a: "Press Cmd+K (or Ctrl+K) to open the universal search from anywhere. The scientific calculator supports full keyboard input. See the dashboard for a complete shortcuts reference." },
];

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <InfoPage title="Frequently Asked Questions">
      <p className="text-base text-gray-300">
        Find answers to common questions about MachinistPro.
      </p>

      <div className="space-y-2 mt-8">
        {FAQS.map((faq, i) => (
          <div key={i} className="rounded-xl border border-dark-600 bg-dark-800/40 overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer group"
            >
              <span className={`text-sm font-medium transition-colors ${openIdx === i ? "text-accent-cyan" : "text-white group-hover:text-accent-cyan"}`}>
                {faq.q}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-500 shrink-0 ml-4 transition-transform ${openIdx === i ? "rotate-180 text-accent-cyan" : ""}`}
              />
            </button>
            {openIdx === i && (
              <div className="px-5 pb-4 animate-fade-in">
                <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </InfoPage>
  );
}
