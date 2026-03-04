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
import { AlertTriangle, CreditCard, MapPin, Save, Truck, Check, Facebook, Link, Calendar, User, X, Plus, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

const profileSchema = z.object({
    shopName: z.string().optional(),
    handle: z.string().optional(),
    isActive: z.boolean(),
    locationCountry: z.string().optional(),
    locationCity: z.string().optional(),
    paymentsAccepted: z.array(z.string()).default([]),
    meetupsEnabled: z.boolean(),
    shippingEnabled: z.boolean(),
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

export default function ShopSettingsPage() {
    const { user, refresh } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isHandleDirty, setIsHandleDirty] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<any>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            shopName: "",
            handle: "",
            isActive: true,
            locationCountry: "",
            locationCity: "",
            meetupsEnabled: false,
            shippingEnabled: false,
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
    const isActive = watch("isActive");
    const avatarUrl = watch("avatarUrl");
    const selectedPayments = watch("paymentsAccepted") || [];

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
        if (user?.profile) {
            reset({
                shopName: user.profile.shopName || "",
                handle: user.profile.handle || "",
                isActive: user.profile.isActive ?? true,
                locationCountry: user.profile.locationCountry || "",
                locationCity: user.profile.locationCity || "",
                paymentsAccepted: user.profile.paymentsAccepted || [],
                meetupsEnabled: user.profile.meetupsEnabled ?? false,
                shippingEnabled: user.profile.shippingEnabled ?? false,
                wishlistText: user.profile.wishlistText || "",
                referenceLinks: Array.isArray(user.profile.referenceLinks)
                    ? user.profile.referenceLinks.filter((l: any) => l && typeof l === 'object' && !Array.isArray(l))
                    : [],
                upcomingEvents: Array.isArray(user.profile.upcomingEvents)
                    ? user.profile.upcomingEvents.filter((e: any) => e && typeof e === 'object' && !Array.isArray(e))
                    : [],
                avatarId: user.profile.avatarId,
                avatarUrl: user.profile.avatarUrl,
            });
            setLoading(false);
        } else if (user) {
            setLoading(false);
        }
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

    const onFormError = (errs: any) => {
        toast.error("Please check the form for errors");
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="max-w-4xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Shop Profile</h1>
                <p className="text-muted-foreground">Manage your public shop identity and settings.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">
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
                                {errors.shopName && <p className="text-xs text-destructive">{(errors.shopName as any)?.message}</p>}
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
                                {errors.handle && <p className="text-xs text-destructive">{(errors.handle as any)?.message}</p>}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                            <div className="space-y-4">
                                <Label className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-primary" />
                                    Shop Avatar
                                </Label>
                                <div className="flex items-center gap-4">
                                    <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted border-2 border-primary/20 flex items-center justify-center">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
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
            </form>
        </div>
    );
}
