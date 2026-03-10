"use client";

import { useState } from "react";
import { deleteAccount } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, LogOut, Check, Facebook } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
    const { logout: authLogout, user, refresh } = useAuth();
    const [deleting, setDeleting] = useState(false);

    const handleLogout = async () => {
        await authLogout();
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("ARE YOU SURE? This will permanently delete your inventory, profile and cannot be reversed.")) {
            return;
        }

        setDeleting(true);
        try {
            await deleteAccount();
            toast.success("Account deleted. Redirecting...");
            setTimeout(() => {
                window.location.href = "/login";
            }, 2000);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete account");
            setDeleting(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and application data.</p>
            </div>

            <div className="space-y-6">
                <Card className="border-border bg-muted/30 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-muted-foreground uppercase text-[10px] tracking-[0.2em] font-bold">Facebook Profile</CardTitle>
                        <CardDescription>Verify your profile so buyers trust your shop.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(user as any)?.facebookVerifiedAt ? (
                            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" /> Connected
                                    </p>
                                    <a href={(user as any).facebookProfileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block truncate max-w-[200px] sm:max-w-xs cursor-pointer">
                                        View Profile
                                    </a>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        try {
                                            const url = new URL('/v1/auth/facebook', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
                                            await fetch(url.toString(), { method: 'DELETE', credentials: 'include' });
                                            toast.success('Disconnected Facebook');
                                            await refresh();
                                        } catch (e) {
                                            toast.error('Failed to disconnect');
                                        }
                                    }}
                                >
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/auth/facebook`;
                                }}
                            >
                                <Facebook className="mr-2 h-4 w-4" />
                                Link Facebook
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border bg-muted/30 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-muted-foreground uppercase text-[10px] tracking-[0.2em] font-bold">Account</CardTitle>
                        <CardDescription>Manage your session and access.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleLogout}
                            className="text-muted-foreground hover:text-foreground transition-all"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out from SlabHub
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete Account"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
