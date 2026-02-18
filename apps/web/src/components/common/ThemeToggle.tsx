import { useEffect, useState } from "react";
import { Sun, Terminal, Moon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Theme, applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const updateTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    if (!mounted) {
        return <div className="h-12 w-full" />; // Placeholder to avoid layout shift
    }

    const themes: { id: Theme; icon: any; label: string }[] = [
        { id: "light", icon: Sun, label: "Light" },
        { id: "dark", icon: Moon, label: "Dark" },
        { id: "cyberpunk", icon: Terminal, label: "Cyber" },
    ];

    return (
        <div className="flex flex-col gap-2 px-3 py-4 border-t border-border mt-auto">
            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground px-1">
                Interface Theme
            </Label>
            <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
                {themes.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => updateTheme(t.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium",
                            theme === t.id
                                ? "bg-background text-foreground shadow-sm border border-border/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <t.icon className={cn(
                            "h-3.5 w-3.5",
                            theme === t.id && t.id === "cyberpunk" && "text-primary",
                            theme === t.id && t.id === "light" && "text-orange-500",
                            theme === t.id && t.id === "dark" && "text-blue-400"
                        )} />
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
