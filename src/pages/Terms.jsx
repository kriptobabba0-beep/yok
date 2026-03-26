import React from 'react';
import { FileText } from 'lucide-react';
import { PageHeader } from '../components/UI';

export default function Terms() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <PageHeader title="Terms of Service" subtitle="Last updated: March 26, 2026" icon={FileText} />

      <div className="glass-card p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using polyuserstats.com (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">2. Description of Service</h2>
          <p>Polyuserstats is an analytics and information platform that displays publicly available data from Polymarket prediction markets. The Service provides tools for viewing market trends, tracking wallet activity, and monitoring trading data. Polyuserstats is an independent project and is not affiliated with, endorsed by, or officially connected to Polymarket.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">3. Not Financial Advice</h2>
          <p>The information provided on the Service is for informational and educational purposes only. Nothing on this Service constitutes financial advice, investment advice, trading advice, or any other kind of professional advice. You should not make any financial decisions based solely on the information provided by the Service. Always do your own research and consult with qualified professionals before making any investment decisions.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">4. User Accounts</h2>
          <p>Some features of the Service require signing in with a Google account. You are responsible for maintaining the security of your account. You agree to provide accurate information and to not create accounts for fraudulent or misleading purposes.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">5. Acceptable Use</h2>
          <p>You agree not to misuse the Service. This includes but is not limited to: attempting to gain unauthorized access to our systems, using automated tools to scrape or overload the Service, interfering with other users' access to the Service, or using the Service for any unlawful purpose.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">6. Data Accuracy</h2>
          <p>While we strive to provide accurate and up-to-date information, we make no guarantees about the accuracy, completeness, or timeliness of the data displayed on the Service. Market data is fetched from third-party APIs and may be delayed, incomplete, or contain errors. We are not responsible for any losses or damages resulting from reliance on information provided by the Service.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">7. Intellectual Property</h2>
          <p>The Service's design, code, and original content are the property of Polyuserstats. Market data displayed on the Service is sourced from publicly available APIs and belongs to their respective owners.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">8. Limitation of Liability</h2>
          <p>The Service is provided "as is" without warranties of any kind, either express or implied. To the fullest extent permitted by law, Polyuserstats shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses resulting from your use of the Service.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">9. Service Availability</h2>
          <p>We do not guarantee that the Service will be available at all times. We may modify, suspend, or discontinue the Service at any time without notice. We are not liable for any downtime or interruptions.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">10. Changes to Terms</h2>
          <p>We reserve the right to update these Terms of Service at any time. Changes will be posted on this page with an updated date. Your continued use of the Service after changes constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">11. Contact</h2>
          <p>If you have questions about these Terms of Service, please contact us at <a href="mailto:contact@polyuserstats.com" className="text-brand-400 hover:text-brand-300 transition-colors">contact@polyuserstats.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
