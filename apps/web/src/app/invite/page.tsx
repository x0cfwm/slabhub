"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getInvitePreview } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/common/Logo";
import { toast } from "sonner";
import { Mail, ArrowRight, UserPlus } from "lucide-react";

function InviteLandingContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [inviterEmail, setInviterEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!token) {
            setLoading(false);
            setError(true);
            return;
        }

        async function loadPreview() {
            try {
                const data = await getInvitePreview(token!);
                setInviterEmail(data.inviterEmailMasked);
            } catch (err) {
                console.error("Invite preview failed:", err);
                setError(true);
                toast.error("Invite invalid or expired");
            } finally {
                setLoading(false);
            }
        }
        loadPreview();
    }, [token]);

    const handleContinue = () => {
        if (token) {
            router.push(`/login?invite=${token}`);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-[440px] border-none shadow-none text-center">
                    <CardContent className="pt-10">
                        <div className="animate-pulse space-y-4">
                            <div className="h-12 w-12 bg-muted rounded-full mx-auto" />
                            <div className="h-6 w-48 bg-muted rounded mx-auto" />
                            <div className="h-4 w-32 bg-muted rounded mx-auto" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-[440px] border-none shadow-none text-center">
                    <CardHeader className="space-y-4">
                        <div className="flex justify-center">
                            <Logo />
                        </div>
                        <CardTitle className="text-2xl font-bold text-destructive">Invite invalid or expired</CardTitle>
                        <CardDescription>
                            This invitation link is no longer valid or missing. Please ask your friend for a new one or join our waitlist.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-6">
                        <Button variant="outline" onClick={() => router.push('/')} className="h-11 px-8">
                            Back to Home
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-50" />

            <div className="mb-12 relative z-10 transition-transform duration-500 hover:scale-105">
                <Logo />
            </div>

            <Card className="w-full max-w-[480px] border border-border/50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] bg-card overflow-hidden rounded-[2.5rem] relative z-10 backdrop-blur-sm">
                <CardHeader className="space-y-6 pt-8 pb-8 text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary/10 text-primary transform rotate-6 transition-transform hover:rotate-0 duration-300">
                        <UserPlus className="h-12 w-12 -rotate-6 transition-transform hover:rotate-0 duration-300" />
                    </div>
                    <div className="space-y-3 px-4">
                        <CardTitle className="text-4xl font-black tracking-tight text-foreground">
                            You're Invited!
                        </CardTitle>
                        <CardDescription className="text-lg text-muted-foreground/80 leading-relaxed max-w-[320px] mx-auto">
                            <span className="font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md italic">{inviterEmail}</span> <br />
                            <span className="inline-block mt-2">invited you to join Slabhub</span>
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 px-10">
                    <div className="rounded-2xl bg-muted/30 p-6 border border-border/50 flex gap-5 items-start transition-all hover:bg-muted/40 group/item">
                        <div className="h-12 w-12 rounded-xl border-2 border-primary/20 bg-background flex items-center justify-center shadow-sm text-primary shrink-0 transition-transform group-hover/item:scale-110">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-bold text-base mb-1">Priority Access</p>
                            <p className="text-sm text-muted-foreground leading-snug">Accept this invite to bypass the waitlist and get immediate access to our seller tools.</p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pb-6 px-10 flex flex-col gap-4">
                    <Button
                        onClick={handleContinue}
                        className="w-full h-16 text-xl font-black shadow-[0_10px_20px_rgba(251,172,0,0.25)] hover:shadow-[0_15px_30px_rgba(251,172,0,0.35)] transition-all duration-300 gap-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        Accept Invite
                        <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function InviteLandingPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        }>
            <InviteLandingContent />
        </Suspense>
    );
}
