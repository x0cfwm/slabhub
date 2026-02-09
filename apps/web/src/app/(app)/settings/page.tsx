"use client";

import { useEffect, useState } from "react";
import { SellerProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, LogOut, MapPin, RefreshCw, Save, Truck } from "lucide-react";

import { useAuth } from "@/components/auth-provider";

export default function SettingsPage() {
    const { user, logout: authLogout } = useAuth();
    const [profile, setProfile] = useState<SellerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            // Use user.profile as initial state, but it might be missing some fields from SellerProfile
            // For now, let's keep it simple or fetch the full profile if needed
            // But since getMe returns profile, we can use it.
            if (user.profile) {
                // @ts-ignore
                setProfile(user.profile);
            }
            setLoading(false);
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSaving(true);
        try {
            // TODO: Implement real profile update in api.ts if needed
            // await updateProfile(profile);
            toast.success("Settings saved");
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };


    const handleLogout = async () => {
        await authLogout();
    };

    if (loading) return <div>Loading settings...</div>;

    return (
        <div className="max-w-4xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your shop profile and application data.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Card className="overflow-hidden border-primary/20 bg-card shadow-sm">
                    <CardHeader className="border-b border-primary/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Shop Profile</CardTitle>
                                <CardDescription>Adjust your public identity and shop status.</CardDescription>
                            </div>
                            <div className="flex items-center space-x-2 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                                <Label htmlFor="shop-active" className="text-sm font-medium cursor-pointer">
                                    Shop is {profile?.isActive ? 'Active' : 'Inactive'}
                                </Label>
                                <Switch
                                    id="shop-active"
                                    checked={profile?.isActive}
                                    onCheckedChange={checked => setProfile(p => p ? { ...p, isActive: checked } : null)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Shop Name</Label>
                                <Input
                                    value={profile?.shopName}
                                    onChange={e => setProfile(p => p ? { ...p, shopName: e.target.value } : null)}
                                    placeholder="e.g. Nami's Treasures"
                                    className="bg-card shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Handle</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">@</span>
                                    <Input
                                        className="pl-7 bg-card shadow-sm"
                                        value={profile?.handle}
                                        onChange={e => setProfile(p => p ? { ...p, handle: e.target.value } : null)}
                                        placeholder="nami-treasures"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    Location (Country)
                                </Label>
                                <Input
                                    value={profile?.locationCountry}
                                    onChange={e => setProfile(p => p ? { ...p, locationCountry: e.target.value } : null)}
                                    placeholder="Singapore"
                                    className="bg-card shadow-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    Location (City)
                                </Label>
                                <Input
                                    value={profile?.locationCity}
                                    onChange={e => setProfile(p => p ? { ...p, locationCity: e.target.value } : null)}
                                    placeholder="Singapore City"
                                    className="bg-card shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-primary" />
                                Payments Accepted
                            </Label>
                            <Input
                                value={profile?.paymentsAccepted.join(", ")}
                                onChange={e => {
                                    const val = e.target.value;
                                    const payments = val.split(",").map(p => p.trim()).filter(p => p !== "");
                                    setProfile(p => p ? { ...p, paymentsAccepted: payments } : null);
                                }}
                                placeholder="PayNow, Cash, PayPal, etc. (comma separated)"
                                className="bg-card shadow-sm"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-primary" />
                                Fulfillment Options
                            </Label>
                            <div className="flex gap-6 pt-1">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="shipping"
                                        checked={profile?.shippingEnabled}
                                        onCheckedChange={checked => setProfile(p => p ? { ...p, shippingEnabled: !!checked } : null)}
                                    />
                                    <Label htmlFor="shipping" className="text-sm font-normal cursor-pointer">
                                        Shipping Available
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="meetups"
                                        checked={profile?.meetupsEnabled}
                                        onCheckedChange={checked => setProfile(p => p ? { ...p, meetupsEnabled: !!checked } : null)}
                                    />
                                    <Label htmlFor="meetups" className="text-sm font-normal cursor-pointer">
                                        Meetups Available
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label>Wishlist / Want to Buy</Label>
                            <Textarea
                                placeholder="What cards are you looking for?"
                                className="min-h-[100px] bg-card shadow-sm"
                                value={profile?.wishlistText}
                                onChange={e => setProfile(p => p ? { ...p, wishlistText: e.target.value } : null)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t border-primary/10 bg-primary/5 px-6 py-4 flex justify-between items-center">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Changes will affect your public profile.
                        </p>
                        <Button type="submit" disabled={saving} className="shadow-lg shadow-primary/20">
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-destructive uppercase text-xs tracking-widest font-bold">Account</CardTitle>
                        <CardDescription>Manage your session and access.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleLogout}
                            className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out from SlabHub
                        </Button>
                    </CardContent>
                </Card>

            </form>
        </div>
    );
}
