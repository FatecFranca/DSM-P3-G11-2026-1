"use client";

import AuthHeader from "@/components/AuthHeader";

export default function SiteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a href="/" className="logo-link" aria-label="Invista">
            <img src="/logo.svg" alt="Invista" className="site-logo" />
          </a>
          <AuthHeader />
        </div>
      </header>
      {children}
    </>
  );
}
