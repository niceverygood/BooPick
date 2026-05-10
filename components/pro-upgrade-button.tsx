"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProBetaModal } from "./pro-beta-modal";

interface Props {
  size?: "sm" | "default" | "lg";
  variant?: "primary" | "outline";
  label?: string;
  className?: string;
}

export function ProUpgradeButton({
  size = "default",
  variant = "primary",
  label = "Pro 업그레이드 →",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size={size}
        onClick={() => setOpen(true)}
        className={
          (variant === "primary"
            ? "bg-boopick-orange hover:bg-boopick-orange/90 text-white "
            : "bg-white border border-boopick-orange text-boopick-orange hover:bg-orange-50 ") +
          (className ?? "")
        }
      >
        {label}
      </Button>
      <ProBetaModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
