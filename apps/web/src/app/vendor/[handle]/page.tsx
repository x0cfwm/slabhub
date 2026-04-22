import { Suspense } from "react";
import VendorClient from "./VendorClient";

// Static export requires a concrete param. We emit a single placeholder
// (`/vendor/_/index.html`) that Netlify serves for any real handle (see
// netlify.toml rewrite); the client router then renders using the real
// handle from the URL.
export function generateStaticParams() {
    return [{ handle: "_" }];
}

export default function VendorPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-primary-foreground/50">Loading vendor...</div>}>
            <VendorClient />
        </Suspense>
    );
}
