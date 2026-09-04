import {
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function safeReturnTo(value: string): string {
  if (
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}

type GateProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo: string;
  description?: string;
};

export default function UniversalParticipationGate({
  open,
  onOpenChange,
  returnTo,
  description = "Anyone can browse public CoogsNation content. A free CoogsNation membership is required to post, reply, create, submit, message or otherwise participate.",
}: GateProps) {
  const destination =
    safeReturnTo(returnTo);

  const goJoin = () => {
    window.location.href =
      `/join?returnTo=${encodeURIComponent(destination)}`;
  };

  const goLogin = () => {
    window.location.href =
      `/login?returnTo=${encodeURIComponent(destination)}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="max-w-md border-2 border-red-700 bg-[#1a1d21] text-white"
        data-testid="universal-participation-gate"
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-700">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>

          <DialogTitle className="text-center text-2xl font-black text-white">
            JOIN COOGSNATION TO PARTICIPATE
          </DialogTitle>

          <DialogDescription className="pt-2 text-center leading-6 text-white/80">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 grid gap-3">
          <Button
            type="button"
            className="min-h-12 bg-red-700 font-black text-white hover:bg-red-800"
            onClick={goJoin}
          >
            JOIN COOGSNATION
          </Button>

          <Button
            type="button"
            variant="outline"
            className="min-h-12 border-2 border-red-500 bg-transparent font-bold text-white hover:bg-red-700 hover:text-white"
            onClick={goLogin}
          >
            ALREADY A MEMBER — SIGN IN
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="min-h-11 text-white/75 hover:bg-white/10 hover:text-white"
            onClick={() =>
              onOpenChange(false)
            }
          >
            NOT NOW — KEEP BROWSING
          </Button>
        </div>

        <p className="text-center text-xs leading-5 text-white/55">
          Guests may browse public content. Membership is required for participation.
        </p>
      </DialogContent>
    </Dialog>
  );
}

type TriggerProps =
  Omit<
    ComponentProps<typeof Button>,
    "onClick"
  > & {
    returnTo: string;
    description?: string;
    children: ReactNode;
  };

export function ParticipationGateButton({
  returnTo,
  description,
  children,
  ...buttonProps
}: TriggerProps) {
  const [open, setOpen] =
    useState(false);

  return (
    <>
      <Button
        {...buttonProps}
        type="button"
        onClick={() =>
          setOpen(true)
        }
      >
        {children}
      </Button>

      <UniversalParticipationGate
        open={open}
        onOpenChange={setOpen}
        returnTo={returnTo}
        description={description}
      />
    </>
  );
}
