"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { requestOtp } from "@/lib/api";
import Link from "next/link";
import { Logo } from "@/components/common/Logo";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const inviteToken = searchParams.get("invite");

    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(`Login failed: ${error.replace(/_/g, " ")}`);
            const token = searchParams.get("invite");
            const newUrl = token ? `/login?invite=${token}` : "/login";
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await requestOtp(email, inviteToken || undefined);
            toast.success("Check your email for the magic code!");
            const otpUrl = inviteToken
                ? `/otp?email=${encodeURIComponent(email)}&invite=${inviteToken}`
                : `/otp?email=${encodeURIComponent(email)}`;
            router.push(otpUrl);
        } catch (error: any) {
            toast.error(error.message || "Failed to send code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-[400px] border-none shadow-none sm:border sm:shadow-sm">
                <CardHeader className="space-y-4 pb-6 text-center">
                    <div className="flex justify-center">
                        <Logo />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-semibold tracking-tight">
                            Welcome to SlabHub
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            {inviteToken
                                ? "You've been invited! Enter your email to join SlabHub."
                                : "Enter your email to continue to SlabHub"
                            }
                        </CardDescription>
                    </div>
                </CardHeader>
                {inviteToken && (
                    <div className="px-6 pb-2">
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-primary flex items-start gap-2">
                            <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">!</div>
                            <p>You are using a priority registration link. After signing up, you will get immediate access.</p>
                        </div>
                    </div>
                )}
                <CardContent className="space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                            {loading ? "Sending..." : "Continue"}
                        </Button>
                    </form>

                    {(() => {
                        const showFacebook = process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_AUTH === "true";
                        const showGoogle = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
                        const showSocial = showFacebook || showGoogle;

                        if (!showSocial) return null;

                        return (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    {showFacebook && (
                                        <Button
                                            variant="outline"
                                            className="h-11 font-medium"
                                            onClick={() => {
                                                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                                                const fbUrl = inviteToken
                                                    ? `${baseUrl}/v1/auth/facebook?invite=${inviteToken}`
                                                    : `${baseUrl}/v1/auth/facebook`;
                                                window.location.href = fbUrl;
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook mr-2 h-4 w-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                            Continue with Facebook
                                        </Button>
                                    )}
                                    {showGoogle && (
                                        <Button
                                            variant="outline"
                                            className="h-11 font-medium"
                                            onClick={() => toast.info("Google login is coming soon!")}
                                        >
                                            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.747-.053-1.453-.16-2.133H12.48z" />
                                            </svg>
                                            Continue with Google
                                        </Button>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </CardContent>
                <CardFooter>
                    <p className="px-8 text-center text-xs leading-relaxed text-muted-foreground">
                        By clicking continue, you agree to our{" "}
                        <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
