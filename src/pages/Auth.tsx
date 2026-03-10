import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BarChart3, FileCheck, Sparkles, Shield, Clock } from "lucide-react";
import { BRAND } from "@/lib/branding";
import BrandLogo from "@/components/BrandLogo";

type Mode = "login" | "signup" | "forgot";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Branded Dashboards",
    desc: "AI-generated intelligence dashboards styled to the company's brand identity.",
  },
  {
    icon: FileCheck,
    title: "Tailored Cover Letters",
    desc: "Personalized cover letters that match the job description and your background.",
  },
  {
    icon: Sparkles,
    title: "Executive Reports",
    desc: "After Action Summaries, architecture diagrams, roadmaps, and executive reports — all branded.",
  },
  {
    icon: Clock,
    title: "Ready in Minutes",
    desc: "Paste a job URL and get a full application package generated in the background.",
  },
];

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Redirect to verify-email page
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "We sent you a password reset link." });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      // Associate error with the relevant field
      if (msg.toLowerCase().includes("password")) {
        setPasswordError(msg);
      } else if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("user")) {
        setEmailError(msg);
      } else {
        setEmailError(msg);
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left — Hero / Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden noise-texture">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8" />
        {/* Decorative background elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/12 blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-accent/10 blur-[100px]" />

        <div className="relative z-10">
          <div className="mb-12">
            <BrandLogo size="lg" />
          </div>

          <h1 className="text-4xl font-heading font-bold tracking-tight leading-tight mb-4 text-foreground">
            Land your next role
            <br />
            with AI-powered
            <br />
            application assets.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed mb-10">
            Paste a job URL and get a complete application package — branded dashboards, tailored cover letters, and
            executive reports — in minutes.
          </p>

          <div className="grid grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <f.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Your data is encrypted and never shared. We take privacy seriously.</span>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile-only branding */}
          <div className="flex items-center justify-center lg:hidden mb-4">
            <BrandLogo size="md" />
          </div>

          <Card className="border-0 shadow-none lg:border lg:shadow-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-heading">
                {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
              </CardTitle>
              <CardDescription>
                {mode === "forgot"
                  ? "Enter your email to receive a reset link"
                  : mode === "login"
                    ? "Sign in to access your applications"
                    : "Get started with your free account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mode !== "forgot" && (
                <Button variant="outline" className="w-full" onClick={handleGoogle}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              )}

              {mode !== "forgot" && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    required
                    placeholder="you@example.com"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                  />
                  {emailError && (
                    <p id="email-error" role="alert" className="text-xs text-destructive">
                      {emailError}
                    </p>
                  )}
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      aria-invalid={!!passwordError}
                      aria-describedby={passwordError ? "password-error" : undefined}
                    />
                    {passwordError && (
                      <p id="password-error" role="alert" className="text-xs text-destructive">
                        {passwordError}
                      </p>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                </Button>
              </form>

              <div className="text-center text-sm space-y-1">
                {mode === "login" && (
                  <>
                    <button
                      className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                      onClick={() => setMode("forgot")}
                    >
                      Forgot password?
                    </button>
                    <p className="text-muted-foreground">
                      No account?{" "}
                      <button
                        className="text-primary font-medium hover:underline underline-offset-4"
                        onClick={() => setMode("signup")}
                      >
                        Sign up free
                      </button>
                    </p>
                  </>
                )}
                {mode === "signup" && (
                  <p className="text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      className="text-primary font-medium hover:underline underline-offset-4"
                      onClick={() => setMode("login")}
                    >
                      Sign in
                    </button>
                  </p>
                )}
                {mode === "forgot" && (
                  <button
                    className="text-primary font-medium hover:underline underline-offset-4"
                    onClick={() => setMode("login")}
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
