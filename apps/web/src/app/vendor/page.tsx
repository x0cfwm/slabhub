import { Suspense } from "react";
import VendorClient from "./VendorClient";

export default function VendorPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-primary-foreground/50">Loading vendor...</div>}>
            <VendorClient />
        </Suspense>
    );
}
