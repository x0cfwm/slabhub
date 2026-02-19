"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { requestOtp } from "@/lib/api";
import Link from "next/link";
import { Logo } from "@/components/common/Logo";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        try {
            await requestOtp(email);
            toast.success("Check your email for the magic code!");
            router.push(`/otp?email=${encodeURIComponent(email)}`);
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
                            Enter your email to continue to SlabHub
                        </CardDescription>
                    </div>
                </CardHeader>
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

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Button
                            variant="outline"
                            className="h-11 font-medium"
                            onClick={() => toast.info("Facebook login is coming soon!")}
                        >
                            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                            </svg>
                            Continue with Facebook
                        </Button>
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
                    </div>
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
