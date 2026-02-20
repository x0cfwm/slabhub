"use client";

import { useEffect, useState } from "react";
import {
    getMyInvite,
    getAcceptedInvites
} from "@/lib/api";
import { Invite, InviteAcceptance } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Users, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function InvitesPage() {
    const [invite, setInvite] = useState<Invite | null>(null);
    const [accepted, setAccepted] = useState<InviteAcceptance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [inviteData, acceptedData] = await Promise.all([
                    getMyInvite(),
                    getAcceptedInvites()
                ]);
                setInvite(inviteData);
                setAccepted(acceptedData);
            } catch (error) {
                console.error("Failed to load invites:", error);
                toast.error("Failed to load invitation data");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const inviteUrl = invite ? `${window.location.origin}/invite?token=${invite.token}` : "";

    const copyToClipboard = () => {
        if (!inviteUrl) return;
        navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied to clipboard!");
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invites</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your invite link and see who joined through your referral.
                    </p>
                </div>
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Invites</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your invite link and see who joined through your referral.
                </p>
            </div>

            <Card className="border-none shadow-sm bg-card">
                <CardHeader>
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <LinkIcon className="h-5 w-5" />
                        <span className="font-semibold text-lg">Your Invite Link</span>
                    </div>
                    <CardDescription className="text-sm">
                        Share this link to let others bypass the waitlist and join SlabHub immediately. It can be used multiple times!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Input
                                readOnly
                                value={inviteUrl}
                                className="pr-10 bg-muted/30 h-12 border-muted"
                            />
                        </div>
                        <Button
                            onClick={copyToClipboard}
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 h-12 gap-2 shrink-0"
                        >
                            <Copy className="h-4 w-4" />
                            Copy Link
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-card">
                <CardHeader>
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                        <Users className="h-5 w-5" />
                        <span className="font-semibold text-lg">Accepted Invites ({accepted.length})</span>
                    </div>
                    <CardDescription className="text-sm">
                        Users who have signed up using your link.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {accepted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-xl bg-muted/10">
                            <div className="bg-muted/20 p-4 rounded-full mb-4">
                                <Users className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                            <p className="text-muted-foreground font-medium">No one has used your invite link yet.</p>
                            <p className="text-sm text-muted-foreground/60 mt-1">Invite your friends to start building your network!</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-muted divide-y divide-muted">
                            {accepted.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {item.invitedEmailMasked[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{item.invitedEmailMasked}</p>
                                            <p className="text-xs text-muted-foreground italic">Accepted on {format(new Date(item.acceptedAt), "MMM d, yyyy")}</p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                                        Active
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>


        </div>
    );
}
