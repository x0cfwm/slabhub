"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, X } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/image-utils";
import { cn } from "@/lib/utils";

interface ImageZoomDialogProps {
    imageUrl: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ImageZoomDialog({ imageUrl, open, onOpenChange }: ImageZoomDialogProps) {
    if (!imageUrl) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={false} className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex items-center justify-center">
                <DialogTitle className="sr-only">Quick Look</DialogTitle>
                <DialogDescription className="sr-only">Zoomed image view of the asset</DialogDescription>
                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img
                        src={getOptimizedImageUrl(imageUrl, { height: 1200, fit: 'scale-down' })}
                        alt="Zoomed view"
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                    />
                    <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-6 right-6 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border-white/10 text-white"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface ImageZoomTriggerProps {
    imageUrl: string | null;
    className?: string;
    children: React.ReactNode;
    onZoom: (url: string) => void;
    showOverlay?: boolean;
}

export function ImageZoomTrigger({ imageUrl, className, children, onZoom, showOverlay = true }: ImageZoomTriggerProps) {
    if (!imageUrl) return <>{children}</>;

    return (
        <div 
            className={cn("relative group cursor-zoom-in", className)}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onZoom(imageUrl);
            }}
        >
            {children}
            {showOverlay && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                    <Maximize2 className="h-4 w-4 text-white" />
                </div>
            )}
        </div>
    );
}

