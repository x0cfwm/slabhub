import { useEffect, useState } from "react";
import { Sun, Terminal, Moon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface ThemeToggleProps {
    iconOnly?: boolean;
}

export function ThemeToggle({ iconOnly }: ThemeToggleProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const updateTheme = (newTheme: Theme) => {
        setTheme(newTheme);
    };

    if (!mounted) {
        return <div className="h-12 w-full" />; // Placeholder to avoid layout shift
    }

    const themes: { id: Theme; icon: any; label: string }[] = [
        { id: "light", icon: Sun, label: "Light" },
        { id: "dark", icon: Moon, label: "Dark" },
        { id: "cyberpunk", icon: Terminal, label: "Cyber" },
    ];

    if (iconOnly) {
        const current = themes.find(t => t.id === (resolvedTheme || theme)) || themes[0];
        const nextTheme = themes[(themes.indexOf(current) + 1) % themes.length];

        return (
            <button
                onClick={() => updateTheme(nextTheme.id)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                title={`Theme: ${current.label}`}
            >
                <current.icon className={cn(
                    "h-5 w-5",
                    theme === "cyberpunk" && "text-primary",
                    theme === "light" && "text-orange-500",
                    theme === "dark" && "text-blue-400"
                )} />
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-2 w-full mt-auto">
            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground px-1">
                Interface Theme
            </Label>
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50 w-full">
                {themes.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => updateTheme(t.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-200 text-[11px] font-semibold min-w-0",
                            theme === t.id
                                ? "bg-background text-foreground shadow-sm border border-border/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <t.icon className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            theme === t.id && t.id === "cyberpunk" && "text-primary",
                            theme === t.id && t.id === "light" && "text-orange-500",
                            theme === t.id && t.id === "dark" && "text-blue-400"
                        )} />
                        <span className="truncate">{t.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
