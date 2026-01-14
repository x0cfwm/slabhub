"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { mockApi } from "@/lib/mockApi";
import { CardProfile, InventoryItem, InventoryStage, ItemType, GradeProvider } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, ChevronRight, ChevronLeft, Check, Package as PackageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AddItemPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [cards, setCards] = useState<CardProfile[]>([]);
    const [search, setSearch] = useState("");

    const [formData, setFormData] = useState<Partial<InventoryItem>>({
        cardProfileId: "",
        itemType: "RAW",
        quantity: 1,
        stage: "ACQUIRED",
        acquisitionPrice: 0,
        listingPrice: null,
        photos: {}
    });

    useEffect(() => {
        mockApi.listCardProfiles(search).then(setCards);
    }, [search]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await mockApi.createInventoryItem(formData as any);
            toast.success("Item added to inventory");
            router.push("/inventory");
        } catch (err) {
            toast.error("Failed to add item");
        } finally {
            setLoading(false);
        }
    };

    const selectedCard = cards.find(c => c.id === formData.cardProfileId);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Add New Item</h1>
                <div className="flex gap-2">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={cn(
                                "h-2 w-12 rounded-full",
                                step >= s ? "bg-primary" : "bg-accent"
                            )}
                        />
                    ))}
                </div>
            </div>

            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 1: Select Card Profile</CardTitle>
                        <CardDescription>Search for the card you want to add.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, set, or card number..."
                                className="pl-9"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                            {cards.map(card => (
                                <div
                                    key={card.id}
                                    onClick={() => setFormData({ ...formData, cardProfileId: card.id })}
                                    className={cn(
                                        "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent",
                                        formData.cardProfileId === card.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                                    )}
                                >
                                    <img src={card.imageUrl} className="h-16 rounded" alt="" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{card.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">{card.set}</p>
                                        <p className="text-[10px] font-mono">{card.cardNumber}</p>
                                    </div>
                                    {formData.cardProfileId === card.id && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-end">
                        <Button
                            disabled={!formData.cardProfileId}
                            onClick={() => setStep(2)}
                        >
                            Next Step
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 2: Item Details</CardTitle>
                        <CardDescription>Configure condition, quantity, and pricing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg">
                            <img src={selectedCard?.imageUrl} className="h-20 rounded shadow" />
                            <div>
                                <h3 className="font-bold">{selectedCard?.name}</h3>
                                <p className="text-sm text-muted-foreground">{selectedCard?.set} • {selectedCard?.cardNumber}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Item Type</Label>
                                <Select
                                    value={formData.itemType}
                                    onValueChange={v => setFormData({ ...formData, itemType: v as ItemType })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RAW">Raw Card</SelectItem>
                                        <SelectItem value="GRADED">Graded Card</SelectItem>
                                        <SelectItem value="SEALED">Sealed Product</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        {formData.itemType === "GRADED" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Grade Provider</Label>
                                    <Select
                                        value={formData.gradeProvider || ""}
                                        onValueChange={v => setFormData({ ...formData, gradeProvider: v as GradeProvider })}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PSA">PSA</SelectItem>
                                            <SelectItem value="BGS">BGS</SelectItem>
                                            <SelectItem value="CGC">CGC</SelectItem>
                                            <SelectItem value="ARS">ARS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Grade Value</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        value={formData.gradeValue || ""}
                                        onChange={e => setFormData({ ...formData, gradeValue: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Acquisition Price ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.acquisitionPrice || ""}
                                    onChange={e => setFormData({ ...formData, acquisitionPrice: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Initial Stage</Label>
                                <Select
                                    value={formData.stage}
                                    onValueChange={v => setFormData({ ...formData, stage: v as InventoryStage })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACQUIRED">Acquired</SelectItem>
                                        <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                                        <SelectItem value="IN_STOCK_UNGRADED">In Stock</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-between">
                        <Button variant="outline" onClick={() => setStep(1)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button onClick={() => setStep(3)}>
                            Next: Photos
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}

            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 3: Upload Photos</CardTitle>
                        <CardDescription>Add photos for verification</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {["Front", "Back", "Details"].map(label => (
                                <div key={label} className="border-2 border-dashed rounded-xl aspect-square flex flex-col items-center justify-center bg-accent/10 hover:bg-accent/20 cursor-pointer transition-colors text-muted-foreground">
                                    <PackageIcon className="h-8 w-8 mb-2 opacity-50" />
                                    <span className="text-xs font-medium">{label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <p className="text-xs text-primary font-medium text-center">
                                Photos are stored as mock URLs in this prototype.
                            </p>
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-between">
                        <Button variant="outline" onClick={() => setStep(2)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? "Adding..." : "Add to Inventory"}
                            <Check className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
