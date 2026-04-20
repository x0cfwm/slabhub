"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile, uploadFile } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, MapPin, Save, Truck, Link, Calendar, User, X, Plus, ImageIcon, ShieldCheck, ArrowRight } from "lucide-react";
import NextLink from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { getOptimizedImageUrl } from "@/lib/image-utils";

const HANDLE_REGEX = /^[a-z0-9-]+$/;

const profileSchema = z.object({
    shopName: z
        .string()
        .trim()
        .min(1, "Shop name is required"),
    handle: z
        .string()
        .trim()
        .min(1, "Handle is required")
        .regex(HANDLE_REGEX, "Handle can only contain lowercase letters, numbers, and hyphens"),
    location: z.string().optional(),
    paymentsAccepted: z.array(z.string()).default([]),
    meetupsEnabled: z.boolean(),
    shippingEnabled: z.boolean(),
    fulfillmentOptions: z.array(z.string()).default([]),
    wishlistText: z.string().optional(),
    referenceLinks: z.array(z.object({
        title: z.string().min(1, "Title is required"),
        url: z.string().url("Must be a valid URL"),
    })).default([]),
    upcomingEvents: z.array(z.object({
        name: z.string().min(1, "Event name is required"),
        date: z.string().optional(),
        location: z.string().optional(),
    })).default([]),
    avatarId: z.string().optional().nullable(),
    avatarUrl: z.string().optional().nullable(),
});

export default function ShopSettingsPage() {
    const { user, refresh } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isHandleDirty, setIsHandleDirty] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [togglingBadge, setTogglingBadge] = useState(false);
    const [togglingActive, setTogglingActive] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        getValues,
        control,
        formState: { errors },
    } = useForm<any>({
        resolver: zodResolver(profileSchema as any),
        defaultValues: {
            shopName: "",
            handle: "",
            location: "",
            meetupsEnabled: false,
            shippingEnabled: false,
            fulfillmentOptions: [],
            wishlistText: "",
            paymentsAccepted: [],
            referenceLinks: [],
            upcomingEvents: [],
            avatarId: null,
            avatarUrl: null,
        }
    });

    const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
        control,
        name: "referenceLinks"
    });

    const { fields: eventFields, append: appendEvent, remove: removeEvent } = useFieldArray({
        control,
        name: "upcomingEvents"
    });

    const shopName = watch("shopName");
    const handleValue = watch("handle");
    const avatarUrl = watch("avatarUrl");
    const selectedPayments = watch("paymentsAccepted") || [];

    const savedProfile = user?.profile;
    const isActive = savedProfile?.isActive ?? false;
    const trimmedShopName = (shopName ?? "").trim();
    const trimmedHandle = (handleValue ?? "").trim();
    const canActivate =
        trimmedShopName.length > 0 &&
        trimmedHandle.length > 0 &&
        HANDLE_REGEX.test(trimmedHandle);

    const paymentOptions = [
        "Paypal G&S",
        "Venmo",
        "Zelle",
        "Cashapp",
        "Cash",
        "Crypto",
        "Other"
    ];

    useEffect(() => {
        if (!user) return;
        const profile = user.profile;
        // The API guarantees every user has a SellerProfile seeded at
        // registration, so shopName/handle are always populated on read.
        reset({
            shopName: profile?.shopName || "",
            handle: profile?.handle || "",
            location: profile?.location || "",
            paymentsAccepted: profile?.paymentsAccepted || [],
            meetupsEnabled: profile?.meetupsEnabled ?? false,
            shippingEnabled: profile?.shippingEnabled ?? false,
            fulfillmentOptions: profile?.fulfillmentOptions || [],
            wishlistText: profile?.wishlistText || "",
            referenceLinks: Array.isArray(profile?.referenceLinks)
                ? profile!.referenceLinks.filter((l: any) => l && typeof l === 'object' && !Array.isArray(l))
                : [],
            upcomingEvents: Array.isArray(profile?.upcomingEvents)
                ? profile!.upcomingEvents.filter((e: any) => e && typeof e === 'object' && !Array.isArray(e))
                : [],
            avatarId: profile?.avatarId ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
        });
        setLoading(false);
    }, [user, reset]);

    useEffect(() => {
        if (shopName && !isHandleDirty && !user?.profile?.handle) {
            const inferredHandle = shopName
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            setValue("handle", inferredHandle, { shouldValidate: true });
        }
    }, [shopName, setValue, isHandleDirty, user?.profile?.handle]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const { url, mediaId } = (await uploadFile(file)) as any;
            setValue("avatarUrl", url);
            setValue("avatarId", mediaId);
            toast.success("Avatar uploaded");
        } catch (err: any) {
            toast.error(err.message || "Failed to upload avatar");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const onSubmit = async (data: any) => {
        setSaving(true);
        try {
            const { avatarUrl, ...payload } = data;
            await updateProfile(payload);
            await refresh();
            toast.success("Shop profile saved successfully");
            setIsHandleDirty(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to save shop profile");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (nextActive: boolean) => {
        if (togglingActive) return;
        if (nextActive && !canActivate) {
            toast.error("Enter a shop name and a valid handle first.");
            return;
        }
        setTogglingActive(true);
        try {
            if (nextActive) {
                // Persist current form edits alongside the activation so the user
                // doesn't need to hit Save before flipping the switch.
                const { avatarUrl: _avatarUrl, ...formPayload } = getValues();
                await updateProfile({ ...formPayload, isActive: true });
                setIsHandleDirty(false);
            } else {
                await updateProfile({ isActive: false });
            }
            await refresh();
            toast.success(nextActive ? "Shop is now active" : "Shop is now inactive");
        } catch (err: any) {
            toast.error(err?.message || "Failed to update shop status");
        } finally {
            setTogglingActive(false);
        }
    };

    const onFormError = (errs: any) => {
        toast.error("Please check the form for errors");
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="max-w-4xl space-y-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Shop Profile</h1>
                <p className="text-muted-foreground">Manage your public shop identity and settings.</p>
            </div>

            <div className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 shadow-sm transition-colors",
                isActive
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/30"
            )}>
                <div className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold">Shop is {isActive ? 'Active' : 'Inactive'}</span>
                    <span className={cn(
                        "inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider",
                        isActive
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-muted border-muted-foreground/20 text-muted-foreground"
                    )}>
                        {isActive ? 'Live' : 'Hidden'}
                    </span>
                    {!isActive && !canActivate && (
                        <span className="flex min-w-0 items-center gap-1 text-xs text-amber-600 dark:text-amber-500 truncate">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Enter shop name and handle first.</span>
                        </span>
                    )}
                </div>
                <Switch
                    id="shop-active"
                    checked={isActive}
                    disabled={togglingActive || (!isActive && !canActivate)}
                    onCheckedChange={handleToggleActive}
                    aria-label="Toggle shop active status"
                />
            </div>

            {isActive && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
                    <div className="flex min-w-0 items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">Show Verified badge on public shop</p>
                            <p className="text-xs text-muted-foreground truncate">
                                {(user as any)?.facebookVerifiedAt
                                    ? "Buyers see a Verified badge linking to your Facebook profile."
                                    : "Connect your Facebook profile in Settings to enable this."}
                            </p>
                        </div>
                    </div>
                    {(user as any)?.facebookVerifiedAt ? (
                        <Switch
                            id="show-fb-badge"
                            checked={!!(user as any)?.showFacebookBadge}
                            disabled={togglingBadge}
                            onCheckedChange={async (checked) => {
                                setTogglingBadge(true);
                                try {
                                    await updateProfile({ showFacebookBadge: checked });
                                    await refresh();
                                    toast.success(checked ? 'Verified badge enabled' : 'Verified badge hidden');
                                } catch (e: any) {
                                    toast.error(e?.message || 'Failed to update badge setting');
                                } finally {
                                    setTogglingBadge(false);
                                }
                            }}
                            aria-label="Toggle Verified badge"
                        />
                    ) : (
                        <Button asChild type="button" variant="outline" size="sm" className="shrink-0">
                            <NextLink href="/settings#facebook-profile">
                                Connect
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </NextLink>
                        </Button>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">
                <Card className="overflow-hidden border-primary/20 bg-card shadow-sm">
                    <CardHeader className="border-b border-primary/10">
                        <CardTitle>Shop Profile</CardTitle>
                        <CardDescription>Adjust your public identity and storefront details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className={cn(errors.shopName && "text-destructive")}>Shop Name *</Label>
                                <Input
                                    {...register("shopName")}
                                    placeholder="e.g. Nami's Treasures"
                                    className={cn("bg-card shadow-sm", errors.shopName && "border-destructive")}
                                />
                                {errors.shopName && <p className="text-xs text-destructive">{(errors.shopName as any)?.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className={cn(errors.handle && "text-destructive")}>Handle *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">@</span>
                                    <Input
                                        className={cn("pl-7 bg-card shadow-sm", errors.handle && "border-destructive")}
                                        {...register("handle")}
                                        onKeyDown={() => setIsHandleDirty(true)}
                                        placeholder="nami-treasures"
                                    />
                                </div>
                                {errors.handle && <p className="text-xs text-destructive">{(errors.handle as any)?.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="space-y-2 col-span-2">
                                <Label className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    Location
                                </Label>
                                <Input
                                    {...register("location")}
                                    placeholder="City, State"
                                    className="bg-card shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                            <div className="space-y-4">
                                <Label className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-primary" />
                                    Shop Avatar
                                </Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted border-2 border-primary/20 flex items-center justify-center">
                                        {avatarUrl ? (
                                            <img src={getOptimizedImageUrl(avatarUrl, { width: 160, height: 160, fit: 'cover' })} alt="Avatar" className="h-full w-full object-cover" />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                        )}
                                        {uploadingAvatar && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => document.getElementById('avatar-upload')?.click()}
                                            disabled={uploadingAvatar}
                                        >
                                            Change Picture
                                        </Button>
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleAvatarUpload}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Square images work best. Max 5MB.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-primary" />
                                    Payments Accepted
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {paymentOptions.map((option) => (
                                        <div key={option} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`payment-${option}`}
                                                checked={selectedPayments.includes(option)}
                                                onCheckedChange={(checked) => {
                                                    const updated = checked
                                                        ? [...selectedPayments, option]
                                                        : selectedPayments.filter((p: any) => p !== option);
                                                    setValue("paymentsAccepted", updated);
                                                }}
                                            />
                                            <Label htmlFor={`payment-${option}`} className="text-sm font-normal cursor-pointer">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <Link className="w-4 h-4 text-primary" />
                                    References
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => appendLink({ title: "", url: "" })}
                                    className="h-8 px-2 text-xs"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Reference
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {linkFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-3 items-start">
                                        <div className="grid grid-cols-2 gap-3 flex-1">
                                            <div className="space-y-1">
                                                <Input
                                                    {...register(`referenceLinks.${index}.title` as const)}
                                                    placeholder="e.g. eBay Store"
                                                    className="bg-card shadow-sm h-9"
                                                />
                                                {((errors.referenceLinks as any)?.[index])?.title && (
                                                    <p className="text-[10px] text-destructive">{((errors.referenceLinks as any)[index]).title.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Input
                                                    {...register(`referenceLinks.${index}.url` as const)}
                                                    placeholder="https://ebay.com/..."
                                                    className="bg-card shadow-sm h-9"
                                                />
                                                {((errors.referenceLinks as any)?.[index])?.url && (
                                                    <p className="text-[10px] text-destructive">{((errors.referenceLinks as any)[index]).url.message}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeLink(index)}
                                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {linkFields.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-2 bg-muted/20 rounded-lg border border-dashed">
                                        No references added yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    Tradeshows
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => appendEvent({ name: "", date: "", location: "" })}
                                    className="h-8 px-2 text-xs"
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Tradeshow
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {eventFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-3 items-start">
                                        <div className="grid grid-cols-3 gap-3 flex-1">
                                            <div className="space-y-1">
                                                <Input
                                                    {...register(`upcomingEvents.${index}.name` as const)}
                                                    placeholder="Event Name"
                                                    className="bg-card shadow-sm h-9"
                                                />
                                                {((errors.upcomingEvents as any)?.[index])?.name && (
                                                    <p className="text-[10px] text-destructive">{((errors.upcomingEvents as any)[index]).name.message}</p>
                                                )}
                                            </div>
                                            <Input
                                                {...register(`upcomingEvents.${index}.date` as const)}
                                                placeholder="Date (e.g. March 10)"
                                                className="bg-card shadow-sm h-9"
                                            />
                                            <Input
                                                {...register(`upcomingEvents.${index}.location` as const)}
                                                placeholder="Location"
                                                className="bg-card shadow-sm h-9"
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeEvent(index)}
                                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {eventFields.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic text-center py-2 bg-muted/20 rounded-lg border border-dashed">
                                        No tradeshows added yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-primary" />
                                Fulfillment Options
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="fulfillment-shipping"
                                        checked={(watch("fulfillmentOptions") || []).includes("shipping")}
                                        onCheckedChange={checked => {
                                            const current = watch("fulfillmentOptions") || [];
                                            const updated = checked
                                                ? [...current, "shipping"]
                                                : current.filter((o: string) => o !== "shipping");
                                            setValue("fulfillmentOptions", updated);
                                        }}
                                    />
                                    <Label htmlFor="fulfillment-shipping" className="text-sm font-normal cursor-pointer">
                                        Shipping
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="fulfillment-meetups-local"
                                        checked={(watch("fulfillmentOptions") || []).includes("meetups_local")}
                                        onCheckedChange={checked => {
                                            const current = watch("fulfillmentOptions") || [];
                                            const updated = checked
                                                ? [...current, "meetups_local"]
                                                : current.filter((o: string) => o !== "meetups_local");
                                            setValue("fulfillmentOptions", updated);
                                        }}
                                    />
                                    <Label htmlFor="fulfillment-meetups-local" className="text-sm font-normal cursor-pointer">
                                        Local Meetups
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="fulfillment-meetups-travel"
                                        checked={(watch("fulfillmentOptions") || []).includes("meetups_travel")}
                                        onCheckedChange={checked => {
                                            const current = watch("fulfillmentOptions") || [];
                                            const updated = checked
                                                ? [...current, "meetups_travel"]
                                                : current.filter((o: string) => o !== "meetups_travel");
                                            setValue("fulfillmentOptions", updated);
                                        }}
                                    />
                                    <Label htmlFor="fulfillment-meetups-travel" className="text-sm font-normal cursor-pointer">
                                        Travel Meetups
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Label>Wishlist / Want to Buy</Label>
                            <Textarea
                                placeholder={`What cards are you looking for? (displayed publicly on your shop page)`}
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

            </form>
        </div>
    );
}
