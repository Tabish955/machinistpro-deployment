
import { InfoPage } from "@/components/layout/info-page";
import { Mail, MessageSquare, Clock, Globe } from "lucide-react";

export default function ContactPage() {
  return (
    <InfoPage title="Contact Us">
      <p className="text-base text-gray-300">
        Have a question, found a bug, or want to suggest a feature? We&apos;d love to hear from you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="p-5 rounded-xl border border-dark-600 bg-dark-800/40">
          <Mail size={20} className="text-accent-cyan mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">Email Support</h3>
          <p className="text-xs text-gray-500 mb-3">For technical support and general inquiries</p>
          <p className="text-sm text-accent-cyan font-mono">support@machinistpro.com</p>
        </div>

        <div className="p-5 rounded-xl border border-dark-600 bg-dark-800/40">
          <Clock size={20} className="text-accent-green mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">Response Time</h3>
          <p className="text-xs text-gray-500 mb-3">We typically respond within</p>
          <p className="text-sm text-white font-semibold">24 hours</p>
        </div>

        <div className="p-5 rounded-xl border border-dark-600 bg-dark-800/40">
          <MessageSquare size={20} className="text-accent-purple mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">Feature Requests</h3>
          <p className="text-xs text-gray-500 mb-3">Suggest new calculators or improvements</p>
          <p className="text-sm text-accent-cyan font-mono">features@machinistpro.com</p>
        </div>

        <div className="p-5 rounded-xl border border-dark-600 bg-dark-800/40">
          <Globe size={20} className="text-accent-amber mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">Business Inquiries</h3>
          <p className="text-xs text-gray-500 mb-3">For licensing and partnerships</p>
          <p className="text-sm text-accent-cyan font-mono">business@machinistpro.com</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white pt-6">Before You Contact Us</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Check the <a href="/faq" className="text-accent-cyan hover:underline">FAQ page</a> for common answers</li>
        <li>Include your MachinistPro version (found in Settings)</li>
        <li>Describe the issue with as much detail as possible</li>
        <li>Include screenshots if reporting a visual issue</li>
      </ul>

      <p className="text-xs text-gray-600 pt-4">© 2025 MachinistPro. All rights reserved.</p>
    </InfoPage>
  );
}
