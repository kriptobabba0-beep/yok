import React from 'react';
import { Shield } from 'lucide-react';
import { PageHeader } from '../components/UI';

export default function Privacy() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <PageHeader title="Privacy Policy" subtitle="Last updated: March 26, 2026" icon={Shield} />

      <div className="glass-card p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-2">1. Introduction</h2>
          <p>Polyuserstats ("we", "our", "us") operates the website polyuserstats.com (the "Service"). This Privacy Policy explains how we collect, use, and protect your information when you use our Service.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">2. Information We Collect</h2>
          <p className="mb-2">We collect the following information:</p>
          <p><span className="text-white font-medium">Account Information:</span> When you sign in with Google, we receive your name, email address, and profile picture from Google. This is used solely for authentication and to identify your account.</p>
          <p className="mt-2"><span className="text-white font-medium">User Data:</span> Wallet addresses you add to your favorites are stored in our database (Firebase Firestore) and linked to your account so they persist across sessions and devices.</p>
          <p className="mt-2"><span className="text-white font-medium">Automatically Collected:</span> We may collect standard web analytics data such as page views, browser type, and device information through Cloudflare analytics. We do not use third-party tracking cookies.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">3. How We Use Your Information</h2>
          <p>We use your information to provide and improve the Service, authenticate your account, save your wallet tracking preferences, and communicate with you if necessary. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">4. Data Storage and Security</h2>
          <p>Your data is stored securely using Google Firebase services. We implement appropriate security measures to protect your information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">5. Third-Party Services</h2>
          <p>Our Service integrates with the following third-party services:</p>
          <p className="mt-2"><span className="text-white font-medium">Google Authentication:</span> Used for user sign-in. Subject to Google's Privacy Policy.</p>
          <p className="mt-2"><span className="text-white font-medium">Polymarket APIs:</span> We fetch publicly available market data from Polymarket. We do not share your personal data with Polymarket.</p>
          <p className="mt-2"><span className="text-white font-medium">Firebase / Firestore:</span> Used for data storage. Subject to Google Cloud's data processing terms.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">6. Your Rights</h2>
          <p>You can delete your account data at any time by removing all tracked wallets and signing out. You may request complete deletion of your data by contacting us. You can use most features of the Service without signing in or providing any personal information.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">7. Cookies</h2>
          <p>We use essential cookies and local storage for authentication state and notification preferences. We do not use advertising or third-party tracking cookies.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">8. Children's Privacy</h2>
          <p>Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">10. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:contact@polyuserstats.com" className="text-brand-400 hover:text-brand-300 transition-colors">contact@polyuserstats.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
