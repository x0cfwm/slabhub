"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockApi } from "@/lib/mockApi";
import { SellerProfile } from "@/lib/types";

export function Topbar() {
    const [profile, setProfile] = useState<SellerProfile | null>(null);

    useEffect(() => {
        mockApi.getCurrentUser().then(setProfile).catch(() => { });
    }, []);

    return (
        <header className="h-16 border-b bg-card px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h2 className="font-semibold">{profile?.shopName || "Loading..."}</h2>
            </div>
            <div className="flex items-center gap-2">
                {profile && (
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/vendor/${profile.handle}`} target="_blank">
                            View Public Page
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </div>
        </header>
    );
}
