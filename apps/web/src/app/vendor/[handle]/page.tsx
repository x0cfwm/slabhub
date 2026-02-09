import VendorClient from "./VendorClient";

export function generateStaticParams() {
    return [{ handle: 'nami-treasures' }];
}

export default function VendorPage() {
    return <VendorClient />;
}
