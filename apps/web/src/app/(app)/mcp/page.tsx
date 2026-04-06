import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mcpDocumentation } from "./content";

function CodeBlock({ code }: { code: string }) {
    return (
        <pre className="overflow-x-auto rounded-xl border bg-muted/40 px-4 py-3 text-xs leading-6 text-foreground">
            <code>{code}</code>
        </pre>
    );
}

export default function McpPage() {
    return (
        <div className="max-w-6xl space-y-8 pb-20">
            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">MCP</p>
                <h1 className="text-3xl font-bold tracking-tight">{mcpDocumentation.title}</h1>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                    {mcpDocumentation.summary}
                </p>
            </div>

            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Methods</h2>
                    <p className="text-sm text-muted-foreground">
                        Every tool is scoped to the authenticated SlabHub user resolved from the MCP session token.
                    </p>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                    {mcpDocumentation.methods.map((method) => (
                        <Card key={method.name} className="border-border bg-card/80">
                            <CardHeader>
                                <CardTitle className="font-mono text-base">{method.name}</CardTitle>
                                <CardDescription>{method.purpose}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                        Inputs
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {method.inputs.map((input) => (
                                            <span
                                                key={input}
                                                className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium"
                                            >
                                                {input}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                        Output
                                    </p>
                                    <p className="text-sm text-foreground">{method.output}</p>
                                </div>
                                <div>
                                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                        Example Prompt
                                    </p>
                                    <CodeBlock code={method.examplePrompt} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">How to Use</h2>
                    <p className="text-sm text-muted-foreground">
                        Wire the stdio server into your MCP client and keep the same SlabHub database plus session context available.
                    </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    {mcpDocumentation.howToUse.map((step) => (
                        <Card key={step.title} className="border-border bg-muted/20">
                            <CardHeader>
                                <CardTitle className="text-lg">{step.title}</CardTitle>
                                <CardDescription>{step.body}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CodeBlock code={step.code} />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Profits</h2>
                    <p className="text-sm text-muted-foreground">
                        Treat MCP as an operations multiplier: less manual movement, faster listing cycles, and cleaner inventory intelligence.
                    </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {mcpDocumentation.profits.map((profit) => (
                        <Card key={profit.title} className="border-border bg-card/80">
                            <CardHeader>
                                <CardTitle className="text-lg">{profit.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-6 text-muted-foreground">{profit.body}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
}
