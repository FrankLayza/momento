/**
 * src/components/AuthHandler.tsx
 * Orchestrates signin search params to open the AuthModal overlay.
 */

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthModal } from "./AuthModal";

export function AuthHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const signinParam = searchParams.get("signin");
    if (signinParam === "1") {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchParams]);

  const handleClose = () => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("signin");
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return <AuthModal isOpen={isOpen} onClose={handleClose} />;
}
