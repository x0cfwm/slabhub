import { INITIAL_SELLER_PROFILE } from "@/lib/seed";
import VendorClient from "./VendorClient";

export function generateStaticParams() {
    return [{ handle: INITIAL_SELLER_PROFILE.handle }];
}

export default function VendorPage() {
    return <VendorClient />;
}
