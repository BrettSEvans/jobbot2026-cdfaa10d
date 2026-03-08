/**
 * Privacy Policy page.
 */
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { BRAND } from "@/lib/branding";

export default function Privacy() {
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
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground"><em>Last updated: March {year}</em></p>

        <h2>1. Information We Collect</h2>
        <h3>Account Information</h3>
        <p>
          When you create an account, we collect your email address, name, and optional profile
          information (skills, experience, preferred tone). If you sign in with Google, we receive
          your name, email, and profile picture from Google.
        </p>

        <h3>Resume & Application Data</h3>
        <p>
          You may upload resume files and enter job descriptions. This content is stored securely
          and used solely to generate your personalized application materials.
        </p>

        <h3>Usage Data</h3>
        <p>
          We collect anonymized usage metrics (pages viewed, features used, generation counts) to
          improve the Service. We do not sell or share this data with third parties for advertising.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To generate tailored resumes, cover letters, and supporting materials</li>
          <li>To manage your account and subscription</li>
          <li>To improve the Service through aggregated, anonymized analytics</li>
          <li>To send essential account notifications (verification, password resets)</li>
        </ul>

        <h2>3. AI Processing</h2>
        <p>
          Your resume text and job descriptions are processed by AI models to generate content.
          This data is sent to our AI providers for the sole purpose of content generation and is
          not used to train third-party models. We do not store AI provider logs beyond the
          generated output.
        </p>

        <h2>4. Data Storage & Security</h2>
        <p>
          Your data is stored on secure, encrypted infrastructure. We use row-level security
          policies to ensure that your data is only accessible to you. Resume files are stored in
          private, access-controlled storage buckets.
        </p>

        <h2>5. Data Sharing</h2>
        <p>We do not sell your personal data. We may share data only:</p>
        <ul>
          <li>With AI service providers, strictly for content generation</li>
          <li>When required by law or legal process</li>
          <li>To protect the rights and safety of {BRAND.name} and its users</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>
          Your account data is retained as long as your account is active. If you delete your
          account, your personal data and generated materials will be permanently removed within
          30 days. Anonymized usage metrics may be retained for analytics purposes.
        </p>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access and download your personal data</li>
          <li>Correct inaccurate information in your profile</li>
          <li>Delete your account and associated data</li>
          <li>Withdraw consent for optional data processing</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management. We do not use
          third-party advertising cookies.
        </p>

        <h2>9. Children's Privacy</h2>
        <p>
          The Service is not intended for users under 16 years of age. We do not knowingly collect
          data from children.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant
          changes through the Service or via email.
        </p>

        <h2>11. Contact</h2>
        <p>
          For privacy-related inquiries, please reach out through the support channels available
          within the application.
        </p>
      </article>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        {BRAND.copyright(year)}
      </footer>
    </div>
  );
}
