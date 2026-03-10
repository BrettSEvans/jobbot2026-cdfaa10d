import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/BrandLogo";

interface Props {
  status: "pending" | "rejected";
}

export default function PendingApproval({ status }: Props) {
  const handleSignOut = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center">
          <BrandLogo size="md" />
        </div>

        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-lg font-heading">
              {status === "pending" ? "Account Pending Approval" : "Registration Not Approved"}
            </CardTitle>
            <CardDescription className="leading-relaxed">
              {status === "pending"
                ? "Your account has been created and is awaiting admin approval. You'll receive full access once approved."
                : "Your registration was not approved. Please contact the administrator for more information."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
