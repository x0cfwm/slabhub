import { ShopEventType } from '@prisma/client';
export class SlabhubAnalyticsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAnalyticsSummary(userId, days = 7) {
        const seller = await this.prisma.sellerProfile.findUnique({
            where: { userId },
        });
        if (!seller) {
            return {
                views: [],
                topItems: [],
                sources: [],
                topCountries: [],
                summary: {
                    totalViews: 0,
                    uniqueVisitors: 0,
                    inquiries: 0,
                    conversionRate: 0,
                },
            };
        }
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);
        const events = await this.prisma.shopEvent.findMany({
            where: {
                sellerProfileId: seller.id,
                createdAt: { gte: startDate },
            },
            include: {
                item: {
                    include: {
                        cardVariant: { include: { card: true } },
                        refPriceChartingProduct: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        const viewsByDay = new Map();
        for (let index = 0; index < days; index += 1) {
            const cursor = new Date();
            cursor.setDate(cursor.getDate() - index);
            const day = cursor.toISOString().split('T')[0];
            viewsByDay.set(day, { date: day, views: 0, unique: new Set() });
        }
        for (const event of events) {
            if (event.type !== ShopEventType.VIEW_SHOP) {
                continue;
            }
            const day = event.createdAt.toISOString().split('T')[0];
            const bucket = viewsByDay.get(day);
            if (!bucket) {
                continue;
            }
            bucket.views += 1;
            if (event.ipHash) {
                bucket.unique.add(event.ipHash);
            }
        }
        const views = Array.from(viewsByDay.values())
            .map((entry) => ({
            date: entry.date,
            views: entry.views,
            unique: entry.unique.size,
        }))
            .sort((left, right) => left.date.localeCompare(right.date));
        const topItemsMap = new Map();
        for (const event of events) {
            if (event.type !== ShopEventType.VIEW_ITEM || !event.itemId) {
                continue;
            }
            const item = event.item;
            const name = item?.productName ||
                item?.cardVariant?.card?.name ||
                item?.refPriceChartingProduct?.title ||
                'Unknown Item';
            const current = topItemsMap.get(event.itemId) ?? { name, views: 0 };
            current.views += 1;
            topItemsMap.set(event.itemId, current);
        }
        const topItems = Array.from(topItemsMap.values())
            .sort((left, right) => right.views - left.views)
            .slice(0, 5);
        const sourcesMap = new Map();
        for (const event of events) {
            if (event.type !== ShopEventType.VIEW_SHOP) {
                continue;
            }
            let source = 'Direct';
            if (event.channel) {
                const normalized = String(event.channel).toLowerCase();
                const aliases = {
                    tg: 'Telegram',
                    telegram: 'Telegram',
                    fb: 'Facebook',
                    facebook: 'Facebook',
                    ig: 'Instagram',
                    instagram: 'Instagram',
                    tw: 'Twitter',
                    twitter: 'Twitter',
                    dc: 'Discord',
                    discord: 'Discord',
                };
                source =
                    aliases[normalized] ??
                        `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
            }
            else if (event.referrer) {
                try {
                    const referrerUrl = new URL(event.referrer);
                    const hostname = referrerUrl.hostname.replace(/^www\./, '');
                    const internalDomains = ['slabhub.gg', 'localhost'];
                    const searchEngines = ['google.', 'bing.', 'duckduckgo.', 'yahoo.', 'yandex.', 'baidu.'];
                    const isInternal = internalDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)) ||
                        hostname.includes('netlify.app');
                    const isSearch = searchEngines.some((needle) => hostname.includes(needle));
                    if (isInternal || isSearch) {
                        source = 'Organic';
                    }
                    else if (hostname.includes('facebook.com') || hostname.includes('fb.me')) {
                        source = 'Facebook';
                    }
                    else if (hostname.includes('t.me') || hostname.includes('telegram.org')) {
                        source = 'Telegram';
                    }
                    else if (hostname.includes('instagram.com')) {
                        source = 'Instagram';
                    }
                    else if (hostname.includes('discord.com') || hostname.includes('discord.gg')) {
                        source = 'Discord';
                    }
                    else if (hostname.includes('t.co') ||
                        hostname.includes('twitter.com') ||
                        hostname.includes('x.com')) {
                        source = 'Twitter';
                    }
                    else {
                        source = hostname;
                    }
                }
                catch {
                    source = 'Direct';
                }
            }
            sourcesMap.set(source, (sourcesMap.get(source) ?? 0) + 1);
        }
        const sources = Array.from(sourcesMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((left, right) => right.value - left.value);
        const countriesMap = events
            .filter((event) => event.type === ShopEventType.VIEW_SHOP)
            .reduce((map, event) => {
            const countryCode = event.countryCode ?? 'Unknown';
            map.set(countryCode, (map.get(countryCode) ?? 0) + 1);
            return map;
        }, new Map());
        const topCountries = Array.from(countriesMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((left, right) => right.value - left.value)
            .slice(0, 5);
        const totalViews = events.filter((event) => event.type === ShopEventType.VIEW_SHOP).length;
        const uniqueVisitors = new Set(events
            .filter((event) => event.type === ShopEventType.VIEW_SHOP)
            .map((event) => event.ipHash)
            .filter(Boolean)).size;
        const inquiries = events.filter((event) => event.type === ShopEventType.INQUIRY_START).length;
        const conversionRate = totalViews > 0 ? Number(((inquiries / totalViews) * 100).toFixed(1)) : 0;
        return {
            views,
            topItems,
            sources,
            topCountries,
            summary: {
                totalViews,
                uniqueVisitors,
                inquiries,
                conversionRate,
            },
        };
    }
}
//# sourceMappingURL=analytics.js.map