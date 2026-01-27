"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight, Shield, TrendingUp, BarChart3 } from "lucide-react";
import { mockApi } from "@/lib/mockApi";
import { SellerProfile } from "@/lib/types";

export default function LandingPage() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockApi.getCurrentUser()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="#">
          <Package className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold text-xl">SlabHub CRM</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          {!loading && profile ? (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/onboarding">Get Started</Link>
            </Button>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background to-accent/20">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  The All-in-One CRM for <span className="text-primary italic">One Piece TCG</span> Sellers
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Manage your inventory, track pricing, and sell cards through your own professional vendor page.
                  Built for serious collectors and vendors.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg" className="px-8">
                  <Link href={profile ? "/dashboard" : "/onboarding"}>
                    {profile ? "Back to Dashboard" : "Get Started Now"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center p-6 border rounded-xl bg-card shadow-sm">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Inventory CRM</h3>
                <p className="text-muted-foreground">
                  Track cards from acquisition to sale. Kanban-style boards for grading and shipping stages.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 border rounded-xl bg-card shadow-sm">
                <div className="p-3 bg-primary/10 rounded-full">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Smart Pricing</h3>
                <p className="text-muted-foreground">
                  Centralized pricing snapshots. One update reflects across all items in your inventory.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 border rounded-xl bg-card shadow-sm">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Vendor Page</h3>
                <p className="text-muted-foreground">
                  Share your personalized link with potential buyers. Clean, professional mobile-first display.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:px-8 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for the One Piece TCG Community. Product Prototype.
          </p>
        </div>
      </footer>
    </div>
  );
}
