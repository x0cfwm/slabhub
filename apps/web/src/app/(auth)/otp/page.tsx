"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { verifyOtp, requestOtp } from "@/lib/api";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { useAuth } from "@/components/auth-provider";

function OtpContent() {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const router = useRouter();
    const { refresh } = useAuth();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const inviteToken = searchParams.get("invite") || "";

    useEffect(() => {
        if (!email) {
            router.push("/login");
        }
    }, [email, router]);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleVerify = async (value: string) => {
        if (value.length !== 6) return;

        setLoading(true);
        try {
            await verifyOtp(email, value, inviteToken || undefined);
            toast.success("Welcome back!");
            await refresh();
            // AuthProvider will handle redirect to /dashboard since we're on an isAuthPage
        } catch (error: any) {
            toast.error(error.message || "Invalid or expired code.");
            setOtp("");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || resending) return;

        setResending(true);
        try {
            await requestOtp(email, inviteToken || undefined);
            toast.success("New code sent!");
            setCooldown(30);
        } catch (error: any) {
            toast.error(error.message || "Failed to resend code.");
        } finally {
            setResending(false);
        }
    };

    const maskedEmail = email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => {
        for (let i = 0; i < gp3.length; i++) { gp2 += "*"; }
        return gp2;
    });

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-[400px] border-none shadow-none sm:border sm:shadow-sm">
                <CardHeader className="space-y-4 pb-6 text-center">
                    <div className="flex justify-center">
                        <Logo />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-semibold tracking-tight">
                            Check your email
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground flex flex-col items-center gap-1">
                            <span>We sent a 6-digit code to {maskedEmail}</span>
                            <Link
                                href={inviteToken ? `/login?invite=${inviteToken}` : "/login"}
                                className="text-foreground flex items-center gap-1 hover:opacity-80 transition-opacity"
                            >
                                <ArrowLeft className="h-3 w-3" /> Change email
                            </Link>
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(val) => {
                            setOtp(val);
                            if (val.length === 6) handleVerify(val);
                        }}
                        disabled={loading}
                        autoFocus
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                            <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                            <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                            <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                            <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                            <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                        </InputOTPGroup>
                    </InputOTP>

                    <div className="text-center text-sm">
                        <p className="text-muted-foreground">
                            Didn't receive the code?{" "}
                            <button
                                onClick={handleResend}
                                disabled={cooldown > 0 || resending}
                                className="text-foreground font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                            >
                                {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? "Sending..." : "Resend code"}
                            </button>
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button
                        className="w-full h-11 font-medium"
                        disabled={otp.length !== 6 || loading}
                        onClick={() => handleVerify(otp)}
                    >
                        {loading ? "Verifying..." : "Verify Code"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function OtpPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        }>
            <OtpContent />
        </Suspense>
    );
}
