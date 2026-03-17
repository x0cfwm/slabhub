import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SlabHub CRM',
    short_name: 'SlabHub',
    description: 'Vendor & Inventory Manager',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#FBAC00',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
