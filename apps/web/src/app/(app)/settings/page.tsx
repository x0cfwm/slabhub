"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SellerProfile } from "@/lib/types";
import { updateProfile } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, LogOut, MapPin, Save, Truck, Check, ChevronsUpDown, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

const profileSchema = z.object({
    shopName: z.string().optional(),
    handle: z.string().optional(),
    isActive: z.boolean(),
    locationCountry: z.string().optional(),
    locationCity: z.string().optional(),
    paymentsAccepted: z.string().optional(),
    meetupsEnabled: z.boolean(),
    shippingEnabled: z.boolean(),
    wishlistText: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.isActive) {
        if (!data.shopName || data.shopName.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Shop name is required",
                path: ["shopName"],
            });
        }
        if (!data.handle || data.handle.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Handle is required",
                path: ["handle"],
            });
        } else if (!/^[a-z0-9-]+$/.test(data.handle)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Handle can only contain lowercase letters, numbers, and hyphens",
                path: ["handle"],
            });
        }
    }
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SettingsPage() {
    const { user, logout: authLogout, refresh } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isHandleDirty, setIsHandleDirty] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const error = params.get("error");
            const success = params.get("success");
            if (error) {
                toast.error(`Facebook linking failed: ${error.replace(/_/g, " ")}`);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            if (success) {
                toast.success("Facebook account successfully linked!");
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }, []);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            shopName: "",
            handle: "",
            isActive: true,
            locationCountry: "",
            locationCity: "",
            paymentsAccepted: "",
            meetupsEnabled: false,
            shippingEnabled: false,
            wishlistText: "",
        }
    });

    const shopName = watch("shopName");
    const isActive = watch("isActive");

    useEffect(() => {
        if (user?.profile) {
            reset({
                shopName: user.profile.shopName || "",
                handle: user.profile.handle || "",
                isActive: user.profile.isActive ?? true,
                locationCountry: user.profile.locationCountry || "",
                locationCity: user.profile.locationCity || "",
                paymentsAccepted: user.profile.paymentsAccepted?.join(", ") || "",
                meetupsEnabled: user.profile.meetupsEnabled ?? false,
                shippingEnabled: user.profile.shippingEnabled ?? false,
                wishlistText: user.profile.wishlistText || "",
            });
            setLoading(false);
        } else if (user) {
            setLoading(false);
        }
    }, [user, reset]);

    // Handle inference from shopName
    useEffect(() => {
        if (shopName && !isHandleDirty) {
            const inferredHandle = shopName
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            setValue("handle", inferredHandle, { shouldValidate: true });
        }
    }, [shopName, setValue, isHandleDirty]);

    const onSubmit = async (data: ProfileFormValues) => {
        setSaving(true);
        try {
            const payload = {
                ...data,
                paymentsAccepted: data.paymentsAccepted
                    ? data.paymentsAccepted.split(",").map(p => p.trim()).filter(p => p !== "")
                    : []
            };
            await updateProfile(payload);
            await refresh();
            toast.success("Settings saved successfully");
        } catch (err: any) {
            toast.error(err.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await authLogout();
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="max-w-4xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your shop profile and application data.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card className="overflow-hidden border-primary/20 bg-card shadow-sm">
                    <CardHeader className="border-b border-primary/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{isActive ? 'Active' : 'Inactive'} Shop Profile</CardTitle>
                                <CardDescription>Adjust your public identity and shop status.</CardDescription>
                            </div>
                            <div className={cn(
                                "flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors border",
                                isActive
                                    ? "bg-primary/5 border-primary/20 text-primary"
                                    : "bg-muted border-muted-foreground/10 text-muted-foreground"
                            )}>
                                <Label
                                    htmlFor="shop-active"
                                    className="text-sm font-medium cursor-pointer"
                                >
                                    Shop is {isActive ? 'Active' : 'Inactive'}
                                </Label>
                                <Switch
                                    id="shop-active"
                                    checked={isActive}
                                    onCheckedChange={checked => setValue("isActive", checked)}
                                    className="data-[state=unchecked]:bg-muted dark:data-[state=unchecked]:bg-input"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className={cn(errors.shopName && "text-destructive")}>Shop Name {isActive && "*"}</Label>
                                <Input
                                    {...register("shopName")}
                                    placeholder="e.g. Nami's Treasures"
                                    className={cn("bg-card shadow-sm", errors.shopName && "border-destructive")}
                                />
                                {errors.shopName && <p className="text-xs text-destructive">{errors.shopName.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className={cn(errors.handle && "text-destructive")}>Handle {isActive && "*"}</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">@</span>
                                    <Input
                                        className={cn("pl-7 bg-card shadow-sm", errors.handle && "border-destructive")}
                                        {...register("handle")}
                                        onKeyDown={() => setIsHandleDirty(true)}
                                        placeholder="nami-treasures"
                                    />
                                </div>
                                {errors.handle && <p className="text-xs text-destructive">{errors.handle.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    Location (Country)
                                </Label>
                                <Input
                                    {...register("locationCountry")}
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
                                    {...register("locationCity")}
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
                                {...register("paymentsAccepted")}
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
                                        checked={watch("shippingEnabled")}
                                        onCheckedChange={checked => setValue("shippingEnabled", !!checked)}
                                    />
                                    <Label htmlFor="shipping" className="text-sm font-normal cursor-pointer">
                                        Shipping Available
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="meetups"
                                        checked={watch("meetupsEnabled")}
                                        onCheckedChange={checked => setValue("meetupsEnabled", !!checked)}
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
                                {...register("wishlistText")}
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

            </form>
        </div>
    );
}
