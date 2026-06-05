"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getAuthEmail, isLoggedIn } from "@/lib/auth";

export default function AuthHeader() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const syncAuth = useCallback(() => {
    setEmail(isLoggedIn() ? getAuthEmail() : null);
    setReady(true);
  }, []);

  useEffect(() => {
    syncAuth();
    window.addEventListener("auth-change", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("auth-change", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, [syncAuth]);

  const handleLogout = () => {
    clearAuth();
    setEmail(null);
    router.push("/login");
  };

  if (!ready) {
    return <div className="header-actions" aria-hidden="true" />;
  }

  if (email) {
    return (
      <div className="header-actions">
        <span className="header-user-email" title={email}>
          {email}
        </span>
        <button type="button" className="btn-auth small btn-logout" onClick={handleLogout}>
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="header-actions">
      <a href="/login" className="btn-auth small">
        Entrar
      </a>
    </div>
  );
}
