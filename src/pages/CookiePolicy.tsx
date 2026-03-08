/**
 * Cookie Policy page — EU/GDPR compliant.
 */
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { BRAND } from "@/lib/branding";

export default function CookiePolicy() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BrandLogo size="sm" />
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-4 py-10 prose prose-sm dark:prose-invert">
        <h1>Cookie Policy</h1>
        <p className="text-muted-foreground"><em>Last updated: March {year}</em></p>

        <p>
          This Cookie Policy explains how {BRAND.name} ("we", "us", or "our") uses cookies and
          similar technologies when you visit our website. This policy is provided in compliance
          with the EU General Data Protection Regulation (GDPR), the ePrivacy Directive
          (2002/58/EC as amended by 2009/136/EC), and applicable national implementations.
        </p>

        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files placed on your device when you visit a website. They are
          widely used to make websites work efficiently, provide functionality, and supply
          information to site owners. Cookies may be "session" cookies (deleted when you close
          your browser) or "persistent" cookies (remain until they expire or you delete them).
        </p>

        <h2>2. Legal Basis for Cookie Use</h2>
        <p>
          Under the GDPR and ePrivacy Directive, we process cookie data based on:
        </p>
        <ul>
          <li>
            <strong>Legitimate interest (Article 6(1)(f) GDPR)</strong> — for strictly necessary
            cookies that are essential to provide the service you requested.
          </li>
          <li>
            <strong>Consent (Article 6(1)(a) GDPR)</strong> — for all non-essential cookies
            (analytics, functional, marketing). We obtain your explicit, informed, freely-given
            consent before setting these cookies via our cookie consent banner.
          </li>
        </ul>

        <h2>3. Categories of Cookies We Use</h2>

        <h3>3.1 Strictly Necessary Cookies</h3>
        <p>
          These cookies are essential for the website to function and cannot be switched off.
          They are usually set in response to actions you take, such as logging in or filling in
          forms. Without these cookies, the service cannot be provided.
        </p>
        <table>
          <thead>
            <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr><td>sb-*-auth-token</td><td>Authentication session</td><td>Session / 1 year</td></tr>
            <tr><td>{BRAND.storagePrefix}_cookie_consent</td><td>Stores your cookie consent preferences</td><td>Persistent (1 year)</td></tr>
          </tbody>
        </table>

        <h3>3.2 Functional Cookies</h3>
        <p>
          These cookies enable enhanced functionality and personalization, such as remembering
          your preferred theme (light/dark), tutorial progress, and UI preferences. If you do not
          allow these cookies, some features may not function as intended.
        </p>
        <table>
          <thead>
            <tr><th>Cookie / Storage Key</th><th>Purpose</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr><td>{BRAND.storagePrefix}_theme</td><td>Theme preference (light/dark)</td><td>Persistent</td></tr>
            <tr><td>{BRAND.storagePrefix}_tutorial_*</td><td>Tutorial completion state</td><td>Persistent</td></tr>
          </tbody>
        </table>

        <h3>3.3 Analytics Cookies</h3>
        <p>
          These cookies help us understand how visitors interact with our website by collecting
          and reporting information anonymously. We use this data to improve the Service. Analytics
          cookies are only set <strong>after you provide explicit consent</strong>.
        </p>
        <table>
          <thead>
            <tr><th>Cookie</th><th>Provider</th><th>Purpose</th><th>Duration</th></tr>
          </thead>
          <tbody>
            <tr><td>ph_*</td><td>PostHog</td><td>Anonymous usage analytics</td><td>1 year</td></tr>
          </tbody>
        </table>

        <h3>3.4 Marketing Cookies</h3>
        <p>
          We do <strong>not</strong> currently use marketing or advertising cookies. If this changes,
          we will update this policy and request your consent before setting any such cookies.
        </p>

        <h2>4. How to Manage Cookies</h2>
        <h3>Via Our Cookie Banner</h3>
        <p>
          When you first visit {BRAND.name}, a cookie consent banner allows you to accept all
          cookies, reject non-essential cookies, or customize your preferences by category. You can
          change your preferences at any time by clearing your browser data and revisiting the site.
        </p>

        <h3>Via Your Browser</h3>
        <p>
          Most web browsers allow you to control cookies through their settings. You can typically
          set your browser to block or delete cookies. Note that blocking essential cookies may
          prevent you from using certain features. For browser-specific instructions:
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/en-us/105082" target="_blank" rel="noopener noreferrer">Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        </ul>

        <h2>5. Third-Party Cookies</h2>
        <p>
          Some cookies are placed by third-party services that appear on our pages. We do not
          control these cookies. Third-party providers include:
        </p>
        <ul>
          <li><strong>PostHog</strong> — privacy-focused analytics (only with your consent)</li>
          <li><strong>Google</strong> — OAuth authentication (strictly necessary for Google sign-in)</li>
        </ul>

        <h2>6. Data Transfers</h2>
        <p>
          Some third-party cookie providers may process data outside the European Economic Area
          (EEA). Where this occurs, we ensure appropriate safeguards are in place, such as Standard
          Contractual Clauses (SCCs) approved by the European Commission or the provider's
          certification under an adequacy framework.
        </p>

        <h2>7. Your Rights Under GDPR</h2>
        <p>
          Under the GDPR, you have the right to:
        </p>
        <ul>
          <li>Withdraw your consent at any time (without affecting the lawfulness of processing before withdrawal)</li>
          <li>Access the personal data we hold about you</li>
          <li>Request erasure of your personal data</li>
          <li>Object to processing based on legitimate interest</li>
          <li>Lodge a complaint with your national data protection authority</li>
        </ul>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Cookie Policy to reflect changes in our practices or for regulatory
          reasons. The "Last updated" date at the top of this page indicates when it was last
          revised. Material changes will be communicated via the Service.
        </p>

        <h2>9. Contact</h2>
        <p>
          For questions about this Cookie Policy or to exercise your data rights, please reach out
          through the support channels available within the application.
        </p>
      </article>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        {BRAND.copyright(year)}
      </footer>
    </div>
  );
}
