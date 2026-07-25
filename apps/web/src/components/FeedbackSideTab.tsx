import { useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { _encatch } from "@encatch/web-sdk";

const FEEDBACK_EMAIL = import.meta.env.VITE_FEEDBACK_EMAIL as string | undefined;

export function FeedbackSideTab() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const openMail = () => {
    const subject = encodeURIComponent("getsecret feedback");
    const body = encodeURIComponent(message.trim() || " ");
    const href = FEEDBACK_EMAIL
      ? `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = href;
    setOpen(false);
    setMessage("");
  };

  const openEncatch = () => {
    _encatch.showForm(import.meta.env.VITE_ENCATCH_FORM_ID);
  };

  return (
    <>
      <button
        type="button"
        onClick={openEncatch}
        className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-3 rounded-l-xl border-y border-l border-border border-r-0 bg-primary py-5 pl-2.5 pr-1 text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Give feedback"
      >
        <span className="select-none text-xs font-semibold uppercase tracking-wider [writing-mode:vertical-rl] rotate-180">
          Give feedback
        </span>
        <MessageSquare className="size-4 shrink-0 opacity-90" aria-hidden />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Give feedback</SheetTitle>
            <SheetDescription>
              Tell us what is working or what we should improve. Your message opens in your email app so you can send
              it from the address you prefer.
            </SheetDescription>
          </SheetHeader>
          <Textarea
            placeholder="Your thoughts…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <SheetFooter className="mt-auto gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={openMail}>
              Submit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
