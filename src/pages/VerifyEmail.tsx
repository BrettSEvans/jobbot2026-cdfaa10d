/**
 * Post-signup page shown after email registration.
 * Prompts user to check inbox and provides a resend button.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck, RefreshCw, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import BrandLogo from "@/components/BrandLogo";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // Try to get the email from URL params (passed from Auth page)
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") ?? "";

  const handleResend = async () => {
    if (!email || cooldown) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Verification email sent! Check your inbox.");
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60_000);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo size="md" />
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl font-heading">Check your email</CardTitle>
            <CardDescription className="text-sm">
              We sent a verification link to{" "}
              {email ? <strong className="text-foreground">{email}</strong> : "your email address"}.
              Click the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p>• The email may take a minute to arrive</p>
              <p>• Check your spam or junk folder</p>
              <p>• Make sure <strong>{email || "your email"}</strong> is correct</p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleResend}
              disabled={resending || cooldown || !email}
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {cooldown ? "Sent — wait 60s to resend" : "Resend verification email"}
            </Button>

            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
