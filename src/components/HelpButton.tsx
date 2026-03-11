import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import HelpDrawer from "./HelpDrawer";

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg hover:scale-105 transition-transform"
        title="Help"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
      <HelpDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
