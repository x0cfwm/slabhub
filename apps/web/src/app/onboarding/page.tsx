"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Package } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        shopName: "Nami's Treasure Shop",
        handle: "nami-treasures",
        location: "Singapore, Singapore",
        paymentsAccepted: ["PayNow", "Cash"],
        meetupsEnabled: true,
        shippingEnabled: true,
        wishlistText: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // TODO: Implement real profile update if needed
            // await updateProfile(formData);
            toast.success("Profile created successfully!");
            router.push("/dashboard");
        } catch (err) {
            toast.error("Failed to save profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const togglePayment = (method: string) => {
        setFormData(prev => ({
            ...prev,
            paymentsAccepted: prev.paymentsAccepted.includes(method)
                ? prev.paymentsAccepted.filter(m => m !== method)
                : [...prev.paymentsAccepted, method]
        }));
    };

    return (
        <div className="min-h-screen bg-accent/10 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Package className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Create Your Vendor Profile</CardTitle>
                    <CardDescription>Set up how users will see your shop online.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="shopName">Shop Name</Label>
                                <Input
                                    id="shopName"
                                    value={formData.shopName}
                                    onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="handle">Unique Handle (for URL)</Label>
                                <div className="flex items-center">
                                    <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm text-muted-foreground truncate">
                                        /vendor?name=
                                    </span>
                                    <Input
                                        id="handle"
                                        className="rounded-l-none"
                                        value={formData.handle}
                                        onChange={e => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                placeholder="City, State"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Payments Accepted</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {["Cash", "PayPal", "PayNow", "Venmo", "Bank Transfer"].map(method => (
                                    <div key={method} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`pay-${method}`}
                                            checked={formData.paymentsAccepted.includes(method)}
                                            onCheckedChange={() => togglePayment(method)}
                                        />
                                        <Label htmlFor={`pay-${method}`} className="font-normal">{method}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Local Meetups</Label>
                                    <p className="text-xs text-muted-foreground">Allow buyers to pick up in person.</p>
                                </div>
                                <Switch
                                    checked={formData.meetupsEnabled}
                                    onCheckedChange={v => setFormData({ ...formData, meetupsEnabled: v })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Shipping</Label>
                                    <p className="text-xs text-muted-foreground">Offer worldwide or domestic shipping.</p>
                                </div>
                                <Switch
                                    checked={formData.shippingEnabled}
                                    onCheckedChange={v => setFormData({ ...formData, shippingEnabled: v })}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating Profile..." : "Complete Setup"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
