"use client";

import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Menu,
  X,
  ArrowRight,
  Layers,
  Link2,
  TrendingUp,
  BarChart3,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { SlabHubTourCarousel } from "@/components/landing/slabhub-tour-carousel";
import { HeroWaitlistForm } from "@/components/landing/hero-waitlist-form";
import { ValueSection } from "@/components/landing/value-section";
import { WaitlistCTASection } from "@/components/landing/waitlist-cta-section";
import { getMe } from "@/lib/api";
import { SellerProfile } from "@/lib/types";

/* ─────────────── Theme Toggle ─────────────── */
function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

/* ─────────────── Navbar ─────────────── */
function Navbar({ profile, loading }: { profile: SellerProfile | null; loading: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-all ${scrolled ? "shadow-lg shadow-black/5" : ""
        }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SlabHub%20Logo%20W%2BG-VBVcWj1F0tt9p6ZzOjdSRVUwP0JC3v.png"
            alt="SlabHub"
            width={140}
            height={36}
            className="hidden h-8 w-auto dark:block"
            priority
          />
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SlabHub%20Logo%20B%2BG-4xfRMWMuvYEGZF3K06WfpAWJUTgWXp.png"
            alt="SlabHub"
            width={140}
            height={36}
            className="block h-8 w-auto dark:hidden"
            priority
          />
        </Link>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {!loading && profile ? (
            <Button
              size="sm"
              className="rounded-full bg-[#FBAC00] px-6 text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_28px_rgba(251,172,0,0.25)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50"
              asChild
            >
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-full bg-[#FBAC00] px-6 text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_28px_rgba(251,172,0,0.25)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50"
              asChild
            >
              <a href="#waitlist">Get Early Access</a>
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            {!loading && profile ? (
              <Button
                className="w-full rounded-full bg-[#FBAC00] px-4 text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_28px_rgba(251,172,0,0.25)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50"
                asChild
              >
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              <Button
                className="w-full rounded-full bg-[#FBAC00] px-4 text-[#030303] shadow-[0_0_20px_rgba(251,172,0,0.15)] transition-all hover:bg-[#FBAC00]/90 hover:shadow-[0_0_28px_rgba(251,172,0,0.25)] focus-visible:ring-2 focus-visible:ring-[#FBAC00]/50"
                asChild
              >
                <a href="#waitlist" onClick={() => setMobileOpen(false)}>
                  Get Early Access
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ─────────────── Hero ─────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-20 lg:px-8 lg:pb-24 lg:pt-28">
      {/* Radial background vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_var(--background)_70%)]" />
      {/* Subtle primary glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          {/* Announcement pill */}
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 backdrop-blur-md">
              <span className="rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                New
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                The #1 TCG Collector CRM
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
            </div>
          </div>

          {/* Two-line headline */}
          <h1 className="font-display text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-b from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              Know your collection.
            </span>
            <br />
            <span className="text-primary">Own the market.</span>
          </h1>

          {/* Feature tiles — 3 top + 2 bottom centered */}
          <div className="relative mx-auto mt-10 w-full max-w-5xl px-4 lg:px-0">
            {/* Mobile: single column stack */}
            {/* Desktop: 6-col grid, each tile spans 2 cols; bottom row offset for centering */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {[
                {
                  icon: <Layers className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(251,172,0,0.5)]" />,
                  title: "CRM",
                  desc: "add, track across stages, list",
                  colClass: "lg:col-span-2",
                },
                {
                  icon: <Link2 className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(251,172,0,0.5)]" />,
                  title: "Public shop page",
                  desc: "share your up to date inventory anywhere",
                  colClass: "lg:col-span-2",
                },
                {
                  icon: <TrendingUp className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(251,172,0,0.5)]" />,
                  title: "Market Price",
                  desc: "last sold for ebay and tcgplayer data",
                  colClass: "lg:col-span-2",
                },
                {
                  icon: <BarChart3 className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(251,172,0,0.5)]" />,
                  title: "Analytics",
                  desc: "know your channels",
                  colClass: "lg:col-span-2 lg:col-start-2",
                },
                {
                  icon: <UserCheck className="h-5 w-5 text-primary dark:drop-shadow-[0_0_8px_rgba(251,172,0,0.5)]" />,
                  title: "Profile",
                  desc: "key info in one place",
                  colClass: "lg:col-span-2 lg:col-start-4",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`group flex items-start gap-4 rounded-[20px] border px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 lg:px-6 lg:py-5 border-black/[0.08] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:border-black/[0.15] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] dark:border-border dark:bg-card dark:shadow-none dark:hover:border-primary/20 dark:hover:shadow-lg dark:hover:shadow-primary/[0.04] ${card.colClass}`}
                >
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-[#F0F3F6] dark:border-white/[0.06] dark:bg-primary/10">
                    {card.icon}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                    <span className="text-sm font-semibold leading-tight text-[#0C0C0C] dark:text-foreground">{card.title}</span>
                    <span className="whitespace-normal break-words text-[13px] leading-relaxed text-[#575757] dark:text-muted-foreground">{card.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waitlist form */}
          <div className="mt-10 flex justify-center">
            <HeroWaitlistForm />
          </div>
        </div>

        {/* Product tour carousel */}
        <div className="mt-16 lg:mt-20">
          <SlabHubTourCarousel />
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Footer ─────────────── */
function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SlabHub%20Logo%20W%2BG-VBVcWj1F0tt9p6ZzOjdSRVUwP0JC3v.png"
            alt="SlabHub"
            width={100}
            height={26}
            className="hidden h-6 w-auto dark:block"
          />
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SlabHub%20Logo%20B%2BG-4xfRMWMuvYEGZF3K06WfpAWJUTgWXp.png"
            alt="SlabHub"
            width={100}
            height={26}
            className="block h-6 w-auto dark:hidden"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {"2026 SlabHub. All rights reserved."}
        </p>
      </div>
    </footer>
  );
}

/* ─────────────── Page ─────────────── */
export default function LandingPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(res => setProfile(res?.profile || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} loading={loading} />
      <main>
        <Hero />
        <ValueSection />
        <WaitlistCTASection />
      </main>
      <Footer />
    </div>
  );
}
