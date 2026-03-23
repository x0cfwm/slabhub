"use client";

import { useEffect, useMemo, useState } from "react";
import {
    generatePosting,
    listInventory,
    listPostingHistory,
    listStatuses,
} from "@/lib/api";
import {
    GeneratedPosting,
    InventoryItem,
    PostingGenerationTarget,
    PostingGenerateRequest,
    PostingHistoryEntry,
    PostingPlatform,
    PostingSelectionMode,
    PostingTextOptions,
    PostingVisualOptions,
    WorkflowStatus,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel";
import {
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Loader2,
    RefreshCw,
    Sparkles,
    Trash2,
    Wand2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PLATFORM_PRESETS: Record<PostingPlatform, {
    textOptions: PostingTextOptions;
    visualOptions: PostingVisualOptions;
    description: string;
}> = {
    INSTAGRAM: {
        textOptions: {
            platform: "INSTAGRAM",
            tone: "HYPE",
            language: "EN",
            includePrice: true,
            includeCondition: true,
            includeGrade: true,
            includeHashtags: true,
            includeCta: true,
        },
        visualOptions: {
            template: "GRID",
            ratio: "4:5",
            showPriceBadge: true,
            showPerformanceTag: true,
            showWatermark: true,
            backgroundStyle: "SUNSET",
        },
        description: "Punchy caption + energetic visual for feed growth.",
    },
    FACEBOOK: {
        textOptions: {
            platform: "FACEBOOK",
            tone: "PROFESSIONAL",
            language: "EN",
            includePrice: true,
            includeCondition: true,
            includeGrade: true,
            includeHashtags: false,
            includeCta: true,
        },
        visualOptions: {
            template: "COLLAGE",
            ratio: "1:1",
            showPriceBadge: true,
            showPerformanceTag: false,
            showWatermark: true,
            backgroundStyle: "LIGHT",
        },
        description: "Cleaner caption + marketplace-friendly visual style.",
    },
};

export default function PostingPage() {
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
    const [history, setHistory] = useState<PostingHistoryEntry[]>([]);

    const [selectionMode, setSelectionMode] = useState<PostingSelectionMode>("BY_STATUS");
    const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [itemSearch, setItemSearch] = useState("");
    const [platform, setPlatform] = useState<PostingPlatform>("INSTAGRAM");

    const [textOptions, setTextOptions] = useState<PostingTextOptions>({ ...PLATFORM_PRESETS.INSTAGRAM.textOptions });
    const [visualOptions, setVisualOptions] = useState<PostingVisualOptions>({ ...PLATFORM_PRESETS.INSTAGRAM.visualOptions });
    const [generated, setGenerated] = useState<GeneratedPosting | null>(null);
    const [editableCaption, setEditableCaption] = useState("");
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [api, setApi] = useState<CarouselApi>();

    useEffect(() => {
        if (!api) return;
        setCurrentImageIndex(api.selectedScrollSnap());
        api.on("select", () => {
            setCurrentImageIndex(api.selectedScrollSnap());
        });
    }, [api]);

    const statusItemCount = useMemo(() => {
        const map = new Map<string, number>();
        for (const item of items) {
            if (!item.statusId) continue;
            map.set(item.statusId, (map.get(item.statusId) ?? 0) + 1);
        }
        return map;
    }, [items]);

    const nonEmptyStatuses = useMemo(
        () => statuses.filter((status) => (statusItemCount.get(status.id) ?? 0) > 0),
        [statuses, statusItemCount],
    );

    const visibleManualItems = useMemo(() => {
        const query = itemSearch.trim().toLowerCase();
        if (!query) return items;

        return items.filter((item) => {
            const title = getItemTitle(item).toLowerCase();
            const subtitle = getItemSubtitle(item).toLowerCase();
            return title.includes(query) || subtitle.includes(query);
        });
    }, [itemSearch, items]);

    const selectedItems = useMemo(() => {
        if (selectionMode === "BY_STATUS") {
            const statuses = new Set(selectedStatusIds);
            return items.filter((item) => item.statusId && statuses.has(item.statusId));
        }

        const ids = new Set(selectedItemIds);
        return items.filter((item) => ids.has(item.id));
    }, [items, selectionMode, selectedItemIds, selectedStatusIds]);

    const liveCaption = useMemo(() => {
        if (selectedItems.length === 0) return "";
        
        const lang = textOptions.language ?? "EN";
        const tone = textOptions.tone ?? "CONCISE";
        const itemCount = selectedItems.length;

        let opener = "";
        if (lang === "RU") {
            if (tone === "HYPE") opener = `Свежий дроп: ${itemCount} позиций уже готовы 💎`;
            else if (tone === "CONCISE") opener = `В наличии ${itemCount} позиций 📦`;
            else opener = `Подготовили подборку из ${itemCount} позиций для продажи ✨`;
        } else {
            if (tone === "HYPE") opener = `Fresh drop: ${itemCount} items just landed 💎`;
            else if (tone === "CONCISE") opener = `${itemCount} items are available now 📦`;
            else opener = `Curated sale update with ${itemCount} items ✨`;
        }

        const lines = selectedItems.slice(0, 48).map((item: any, index) => {
            const chunks: string[] = [getItemTitle(item)];
            
            const subtitle = getItemSubtitle(item);
            if (subtitle) chunks.push(`(${subtitle})`);

            const itemGrade = item.gradeValue || item.grade;
            if (textOptions.includeGrade && itemGrade) {
                chunks.push(`Grade ${itemGrade}`);
            }

            if (textOptions.includeCondition && item.condition) {
                chunks.push(`Cond ${item.condition}`);
            }

            const price = item.listingPrice ?? item.marketPriceSnapshot ?? item.marketPrice ?? null;
            if (textOptions.includePrice && price !== null) {
                chunks.push(`$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
            }

            const emojiNumber = String(index + 1)
                .split("")
                .map((digit) => `${digit}\ufe0f\u20e3`)
                .join("");

            return `${emojiNumber} ${chunks.join(" | ")}`;
        });

        const cta = textOptions.includeCta
            ? (lang === "RU" ? "\nНапишите в ЛС для покупки или резерва 📩" : "\nDM to reserve or buy 📩")
            : "";

        const hashtags = textOptions.includeHashtags
            ? (textOptions.platform === "INSTAGRAM" 
                ? "\n\n#slabhub #tcg #pokemoncards #onepiececardgame #cardsforsale" 
                : "\n\n#slabhub #tcg #cardsforsale")
            : "";

        return [opener, ...lines].join("\n") + cta + hashtags;
    }, [selectedItems, textOptions]);

    useEffect(() => {
        if (generated?.caption) {
            setEditableCaption(generated.caption);
        } else {
            setEditableCaption(liveCaption);
        }
    }, [generated?.caption, liveCaption]);

    useEffect(() => {
        const load = async () => {
            try {
                const [inventory, workflowStatuses, postingHistory] = await Promise.all([
                    listInventory(),
                    listStatuses(),
                    listPostingHistory(12),
                ]);

                setItems(inventory);
                setStatuses(workflowStatuses);
                setHistory(postingHistory);

                const firstNonEmptyStatus = workflowStatuses.find(
                    (status) => (inventory.filter((item) => item.statusId === status.id).length > 0),
                );
                if (firstNonEmptyStatus) {
                    setSelectedStatusIds([firstNonEmptyStatus.id]);
                }
            } catch (error) {
                toast.error("Failed to load posting builder data");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    useEffect(() => {
        if (selectionMode !== "BY_STATUS") return;
        const allowed = new Set(nonEmptyStatuses.map((status) => status.id));
        setSelectedStatusIds((prev) => {
            const next = prev.filter((id) => allowed.has(id));
            if (next.length > 0) return next;
            return nonEmptyStatuses[0] ? [nonEmptyStatuses[0].id] : [];
        });
    }, [nonEmptyStatuses, selectionMode]);

    const toggleStatus = (statusId: string) => {
        setSelectedStatusIds((prev) =>
            prev.includes(statusId) ? prev.filter((id) => id !== statusId) : [...prev, statusId],
        );
    };

    const toggleItem = (itemId: string) => {
        setSelectedItemIds((prev) =>
            prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
        );
    };

    const applyPlatformPreset = (nextPlatform: PostingPlatform) => {
        setPlatform(nextPlatform);
        setTextOptions({ ...PLATFORM_PRESETS[nextPlatform].textOptions });
        setVisualOptions({ ...PLATFORM_PRESETS[nextPlatform].visualOptions });
    };

    const buildPayload = (target: PostingGenerationTarget): PostingGenerateRequest => {
        const payload: PostingGenerateRequest = {
            selectionMode,
            textOptions,
            visualOptions,
            generationTarget: target,
            previousPostId: target === "BOTH" ? undefined : generated?.id,
        };

        if (selectionMode === "BY_STATUS") {
            payload.statusIds = selectedStatusIds;
        } else {
            payload.itemIds = selectedItemIds;
        }

        return payload;
    };

    const refreshHistory = async () => {
        try {
            const postingHistory = await listPostingHistory(12);
            setHistory(postingHistory);
        } catch {
            // Keep current in-memory data if background refresh fails.
        }
    };

    const handleGenerate = async (target: PostingGenerationTarget = "BOTH") => {
        if (selectionMode === "BY_STATUS" && selectedStatusIds.length === 0) {
            toast.error("Select at least one status");
            return;
        }

        if (selectionMode === "MANUAL" && selectedItemIds.length === 0) {
            toast.error("Select at least one inventory item");
            return;
        }

        setIsGenerating(true);
        try {
            const response = await generatePosting(buildPayload(target));
            setGenerated(response);
            setCurrentImageIndex(0);
            await refreshHistory();
            toast.success(target === "BOTH" ? "Post content generated" : "Regenerated successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to generate content");
        } finally {
            setIsGenerating(false);
        }
    };

    const copyCaption = async () => {
        if (!generated?.caption) return;
        try {
            await navigator.clipboard.writeText(generated.caption);
            toast.success("Caption copied");
        } catch {
            toast.error("Copy failed");
        }
    };

    const downloadImage = () => {
        if (!generated?.imageDataUrl || generated.imageDataUrl.length === 0) return;
        const currentImageUrl = generated.imageDataUrl[currentImageIndex];
        if (!currentImageUrl) return;

        const link = document.createElement("a");
        link.href = currentImageUrl;
        link.download = `slabhub-post-${generated.id}-img-${currentImageIndex + 1}.svg`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const applyHistoryEntry = (entry: PostingHistoryEntry) => {
        setGenerated({
            id: entry.id,
            createdAt: entry.createdAt,
            generationTarget: entry.generationTarget,
            itemCount: entry.itemCount,
            caption: entry.caption,
            imageDataUrl: entry.imageDataUrl,
            items: [],
            textOptions: entry.options.textOptions,
            visualOptions: entry.options.visualOptions,
        });
        setCurrentImageIndex(0);
        const entryPlatform = entry.platform as PostingPlatform;
        setPlatform(entryPlatform);
        setTextOptions(entry.options.textOptions);
        setVisualOptions(entry.options.visualOptions);

        if (entry.selectionMode === "BY_STATUS") {
            setSelectionMode("BY_STATUS");
            setSelectedStatusIds(entry.statusIds);
        } else {
            setSelectionMode("MANUAL");
            setSelectedItemIds(entry.itemIds);
        }
    };

    if (loading) {
        return <PostingSkeleton />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Post Generator</h1>
                <p className="text-muted-foreground">
                    Build social-ready caption + visual bundles from inventory.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Column 1: Compose */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Select Inventory</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-0">
                            <Tabs value={selectionMode} onValueChange={(value) => setSelectionMode(value as PostingSelectionMode)}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="BY_STATUS">By Status</TabsTrigger>
                                    <TabsTrigger value="MANUAL">Manual</TabsTrigger>
                                </TabsList>
                            </Tabs>

                            {selectionMode === "BY_STATUS" ? (
                                <div className="space-y-2">
                                    {nonEmptyStatuses.map((status) => {
                                        const checked = selectedStatusIds.includes(status.id);
                                        return (
                                            <label key={status.id} className="flex items-center justify-between rounded-lg border p-3 cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox checked={checked} onCheckedChange={() => toggleStatus(status.id)} />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{status.name}</span>
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full border"
                                                            style={{ backgroundColor: status.color || "#94a3b8" }}
                                                        />
                                                    </div>
                                                </div>
                                                <Badge variant="secondary">{statusItemCount.get(status.id) ?? 0}</Badge>
                                            </label>
                                        );
                                    })}
                                    {nonEmptyStatuses.length === 0 && (
                                        <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                            No statuses with items available.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Input
                                        placeholder="Search inventory..."
                                        value={itemSearch}
                                        onChange={(event) => setItemSearch(event.target.value)}
                                    />
                                    <div className="max-h-[300px] overflow-auto space-y-2 pr-1">
                                        {visibleManualItems.map((item) => {
                                            const checked = selectedItemIds.includes(item.id);
                                            return (
                                                <label key={item.id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                                                    <Checkbox checked={checked} onCheckedChange={() => toggleItem(item.id)} className="mt-1" />
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">{getItemTitle(item)}</p>
                                                        <p className="text-xs text-muted-foreground">{getItemSubtitle(item)}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                                Selected: <span className="font-semibold">{selectedItems.length} items</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-sm font-semibold">Content Strategy</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-3">
                                <Label className="text-xs text-muted-foreground uppercase font-semibold">Target Platform</Label>
                                <Tabs value={platform} onValueChange={(val) => applyPlatformPreset(val as PostingPlatform)}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="INSTAGRAM">Instagram</TabsTrigger>
                                        <TabsTrigger value="FACEBOOK">Facebook</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase font-semibold">Tone</Label>
                                    <Select value={textOptions.tone} onValueChange={(val) => setTextOptions(p => ({ ...p, tone: val as any }))}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HYPE">Hype 🔥</SelectItem>
                                            <SelectItem value="CONCISE">Concise 📦</SelectItem>
                                            <SelectItem value="PROFESSIONAL">Professional 💼</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase font-semibold">Language</Label>
                                    <Select value={textOptions.language} onValueChange={(val) => setTextOptions(p => ({ ...p, language: val as any }))}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EN">English 🇺🇸</SelectItem>
                                            <SelectItem value="RU">Russian 🇷🇺</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="include-price" className="text-sm cursor-pointer">Include Prices</Label>
                                    <Switch id="include-price" checked={textOptions.includePrice} onCheckedChange={(val) => setTextOptions(p => ({ ...p, includePrice: val }))} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="include-grade" className="text-sm cursor-pointer">Include Grades</Label>
                                    <Switch id="include-grade" checked={textOptions.includeGrade} onCheckedChange={(val) => setTextOptions(p => ({ ...p, includeGrade: val }))} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="include-cond" className="text-sm cursor-pointer">Include Condition</Label>
                                    <Switch id="include-cond" checked={textOptions.includeCondition} onCheckedChange={(val) => setTextOptions(p => ({ ...p, includeCondition: val }))} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="include-cta" className="text-sm cursor-pointer">Include CTA</Label>
                                    <Switch id="include-cta" checked={textOptions.includeCta} onCheckedChange={(val) => setTextOptions(p => ({ ...p, includeCta: val }))} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button onClick={() => handleGenerate("BOTH")} disabled={isGenerating || selectedItems.length === 0} size="lg" className="w-full shadow-lg h-12">
                        {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        Generate Feed Bundle
                    </Button>
                </div>


                {/* Column 2: Preview Image */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <div className="flex flex-col">
                                <CardTitle className="text-sm font-semibold">Visual Preview</CardTitle>
                                {generated?.imageDataUrl && generated.imageDataUrl.length > 1 && (
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5 tracking-wider">
                                        Image {currentImageIndex + 1} of {generated.imageDataUrl.length}
                                    </span>
                                )}
                            </div>
                            {generated?.imageDataUrl && generated.imageDataUrl.length > 0 && (
                                <Button variant="ghost" size="icon" onClick={downloadImage} title="Download SVG">
                                    <Download className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            {generated?.imageDataUrl && generated.imageDataUrl.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
                                            <CarouselContent>
                                                {generated.imageDataUrl.map((url, index) => (
                                                    <CarouselItem key={index}>
                                                        <div 
                                                            className="relative cursor-zoom-in overflow-hidden rounded-lg border shadow-sm"
                                                            onClick={() => setIsZoomOpen(true)}
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={url} alt={`Generated post ${index + 1}`} className="w-full h-auto" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                                        </div>
                                                    </CarouselItem>
                                                ))}
                                            </CarouselContent>
                                            
                                            {generated.imageDataUrl.length > 1 && (
                                                <>
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all rounded-full h-11 w-11 shadow-lg border-2 bg-background/90 hover:bg-background z-10"
                                                        onClick={(e) => { e.stopPropagation(); api?.scrollPrev(); }}
                                                        disabled={!api?.canScrollPrev()}
                                                    >
                                                        <span className="sr-only">Previous image</span>
                                                        <ChevronLeft className="h-6 w-6" />
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all rounded-full h-11 w-11 shadow-lg border-2 bg-background/90 hover:bg-background z-10"
                                                        onClick={(e) => { e.stopPropagation(); api?.scrollNext(); }}
                                                        disabled={!api?.canScrollNext()}
                                                    >
                                                        <span className="sr-only">Next image</span>
                                                        <ChevronRight className="h-6 w-6" />
                                                    </Button>
                                                </>
                                            )}
                                        </Carousel>
                                    </div>

                                    <Button variant="outline" className="w-full shadow-sm" onClick={downloadImage}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Save Image {generated.imageDataUrl.length > 1 ? `${currentImageIndex + 1}` : ""}
                                    </Button>

                                    {generated.imageDataUrl.length > 1 && (
                                        <div className="flex justify-center gap-1.5 pt-1">
                                            {generated.imageDataUrl.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setCurrentImageIndex(i)}
                                                    className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? "w-4 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground"}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground text-center p-6 bg-muted/20">
                                    <p>Image preview will appear here after generation.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Column 3: Preview Text */}
                <div className="space-y-6">
                    <Card className="h-full flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-muted/20">
                            <div className="flex flex-col">
                                <CardTitle className="text-sm font-semibold">Caption Preview</CardTitle>
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5 tracking-wider">
                                    {generated ? "Generated" : "Live Preview"}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {generated && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setGenerated(null)} title="Back to live preview">
                                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyCaption} title="Copy to clipboard">
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 flex-1 flex flex-col pt-3">
                            {editableCaption ? (
                                <div className="space-y-4 flex-1 flex flex-col">
                                    <Textarea
                                        value={editableCaption}
                                        onChange={(e) => setEditableCaption(e.target.value)}
                                        className="font-mono text-xs leading-relaxed min-h-[460px] flex-1 bg-muted/40 focus-visible:ring-1"
                                        placeholder="No caption content..."
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="secondary" onClick={copyCaption}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy
                                        </Button>
                                        <Button variant="outline" onClick={() => handleGenerate("TEXT_ONLY")} disabled={isGenerating || selectedItems.length === 0}>
                                            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                            Refine
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground text-center p-6 bg-muted/20">
                                    <p>Caption preview will appear here as you select items.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none overflow-hidden flex items-center justify-center">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Visual Preview Zoom</DialogTitle>
                    </DialogHeader>
                    {generated?.imageDataUrl[currentImageIndex] && (
                        <div className="relative group/zoom">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={generated.imageDataUrl[currentImageIndex]} 
                                alt="Zoomed preview" 
                                className="w-auto h-auto max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl"
                            />
                            
                            {generated.imageDataUrl.length > 1 && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/zoom:opacity-100 transition-all rounded-full h-14 w-14 shadow-xl border-2 bg-background/90 hover:bg-background z-50 text-foreground"
                                        onClick={(e) => { e.stopPropagation(); api?.scrollPrev(); }}
                                        disabled={!api?.canScrollPrev()}
                                    >
                                        <span className="sr-only">Previous image</span>
                                        <ChevronLeft className="h-8 w-8" />
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/zoom:opacity-100 transition-all rounded-full h-14 w-14 shadow-xl border-2 bg-background/90 hover:bg-background z-50 text-foreground"
                                        onClick={(e) => { e.stopPropagation(); api?.scrollNext(); }}
                                        disabled={!api?.canScrollNext()}
                                    >
                                        <span className="sr-only">Next image</span>
                                        <ChevronRight className="h-8 w-8" />
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function getItemTitle(item: InventoryItem): string {
    return item.productName || item.cardProfile?.name || "Untitled item";
}

function getItemSubtitle(item: InventoryItem): string {
    const stage = item.status?.name || item.stage;
    const setCode = item.cardProfile?.set || item.setName || "";
    const number = item.cardProfile?.cardNumber || "";
    return [setCode, number, stage].filter(Boolean).join(" • ");
}

function PostingSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Skeleton className="h-[600px] w-full" />
                <Skeleton className="h-[600px] w-full" />
                <Skeleton className="h-[600px] w-full" />
            </div>
        </div>
    );
}

