import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import type { SaveCardButtonProps } from "./profileTypes";

export default function SaveCardButton({ cardName, isDirty, saving, savingCard, onSave }: SaveCardButtonProps) {
  return (
    <CardFooter className="pt-3 pb-4 flex justify-end">
      <Button
        size="sm"
        onClick={() => onSave(cardName)}
        disabled={!isDirty || saving || savingCard !== null}
        variant={isDirty ? "default" : "outline"}
      >
        {savingCard === cardName ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="mr-2 h-3.5 w-3.5" />
        )}
        {isDirty ? "Save Changes" : "Saved"}
      </Button>
    </CardFooter>
  );
}
