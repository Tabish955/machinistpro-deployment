import { InfoPage } from "@/components/layout/info-page";

export default function TermsPage() {
  return (
    <InfoPage title="Terms & Conditions">
      <p className="text-xs text-gray-600">Last updated: July 2025</p>

      <p>
        By accessing and using MachinistPro (&quot;the Application&quot;), you agree to the
        following terms and conditions. Please read them carefully.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">1. License</h2>
      <p>
        MachinistPro grants you a limited, non-exclusive, non-transferable license to use the
        Application for personal and commercial engineering calculations, subject to a valid license
        key.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">2. Acceptable Use</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Use the Application for lawful engineering and educational purposes</li>
        <li>Do not reverse-engineer, decompile, or modify the Application</li>
        <li>Do not redistribute, resell, or sublicense the Application</li>
        <li>Do not share your license credentials with unauthorized users</li>
        <li>Do not attempt to bypass or circumvent the authentication system</li>
      </ul>

      <h2 className="text-lg font-semibold text-white pt-2">3. Engineering Disclaimer</h2>
      <p>
        <strong className="text-accent-amber">Important:</strong> MachinistPro is an engineering
        calculation tool, not a substitute for professional engineering judgment. All calculations
        should be independently verified before use in critical applications. We do not accept
        liability for decisions made based on calculations from this Application.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">4. Accuracy</h2>
      <p>
        We strive for accuracy in all calculations, formulas, and reference data. However, we do not
        guarantee that all values are free from errors. Material properties, cutting data, and
        reference values are approximate and should be verified against authoritative sources for
        critical applications.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">5. Data & Privacy</h2>
      <p>
        Your calculation data is stored locally on your device. We do not access, store, or transmit
        your engineering data. See our Privacy Policy for full details.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">6. Intellectual Property</h2>
      <p>
        The Application, including its design, code, formulas, databases, and documentation, is the
        intellectual property of MachinistPro. All rights reserved.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, MachinistPro shall not be liable for any indirect,
        incidental, special, or consequential damages arising from the use of this Application,
        including but not limited to errors in calculations, data loss, or business interruption.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">8. Termination</h2>
      <p>
        We reserve the right to terminate or suspend your access for violation of these terms. Upon
        termination, your local data remains on your device.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">9. Changes</h2>
      <p>
        We may update these terms from time to time. Continued use of the Application after changes
        constitutes acceptance of the updated terms.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">10. Contact</h2>
      <p>For questions about these terms, contact us at support@machinistpro.com.</p>
    </InfoPage>
  );
}
