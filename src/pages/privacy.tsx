import { InfoPage } from "@/components/layout/info-page";

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p className="text-xs text-gray-600">Last updated: July 2025</p>

      <p>
        MachinistPro (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) respects your privacy. This
        Privacy Policy explains how we collect, use, and protect your information when you use our
        application.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">1. Information We Collect</h2>
      <p>
        <strong className="text-gray-300">Authentication Data:</strong> When you log in, your
        username is checked against our own secure account database. We do not
        store passwords.
      </p>
      <p>
        <strong className="text-gray-300">Local Data:</strong> All calculations, projects, history,
        favorites, and settings are stored locally on your device using browser local storage. We do
        not have access to this data.
      </p>
      <p>
        <strong className="text-gray-300">Analytics:</strong> We use Google Analytics to collect
        anonymous usage statistics such as page views and general usage patterns. No personally
        identifiable engineering data is collected.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">2. How We Use Information</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>To authenticate your access to the application</li>
        <li>To improve the application based on anonymous usage patterns</li>
        <li>To provide technical support when requested</li>
      </ul>

      <h2 className="text-lg font-semibold text-white pt-2">3. Data Storage</h2>
      <p>
        MachinistPro uses an offline-first architecture. Your engineering data — calculations,
        projects, notes, and preferences — is stored exclusively on your device. We do not transmit,
        store, or have access to your calculation data.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">4. Third-Party Services</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <strong className="text-gray-300">MachinistPro accounts:</strong> Licence and session
          data is stored in our own encrypted backend and never shared with third parties.
        </li>
        <li>
          <strong className="text-gray-300">Google Analytics:</strong> Used for anonymous usage
          statistics. See Google&apos;s privacy policy at policies.google.com/privacy.
        </li>
      </ul>

      <h2 className="text-lg font-semibold text-white pt-2">5. Cookies</h2>
      <p>
        MachinistPro uses browser local storage (not cookies) for application data. Google Analytics
        may set cookies for analytics purposes.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">6. Data Security</h2>
      <p>
        We implement reasonable security measures including encrypted authentication, server-side
        credential handling, and no client-side exposure of sensitive data. Your local data is
        protected by your browser&apos;s built-in security mechanisms.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">7. Your Rights</h2>
      <p>
        You can export or delete all your local data at any time through Settings → Export Backup or
        Settings → Clear Local Data. Since we don&apos;t store your engineering data, there is no
        server-side data to delete.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this page
        with an updated revision date.
      </p>

      <h2 className="text-lg font-semibold text-white pt-2">9. Contact</h2>
      <p>For privacy-related inquiries, contact us at support@machinistpro.com.</p>
    </InfoPage>
  );
}
