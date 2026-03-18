import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { ShopEventType } from '@prisma/client';
import * as geoip from 'geoip-lite';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackEvent(data: {
    type: ShopEventType;
    handle: string;
    itemId?: string;
    channel?: string;
    ip: string;
    userAgent: string;
    referrer?: string;
  }) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { handle: data.handle },
    });

    if (!seller) {
      throw new NotFoundException(`Vendor with handle "${data.handle}" not found`);
    }

    // Hash IP for uniqueness, but also store for debug as requested
    const ipHash = createHash('sha256').update(data.ip).digest('hex');

    // Enhanced channel detection from User-Agent
    let channel = data.channel;
    const ua = data.userAgent.toLowerCase();
    if (!channel) {
        if (ua.includes('telegrambot') || ua.includes('telegram')) {
            channel = 'telegram';
        } else if (ua.includes('facebook') || ua.includes('fban') || ua.includes('fbav')) {
            channel = 'facebook';
        } else if (ua.includes('instagram')) {
            channel = 'instagram';
        } else if (ua.includes('discord')) {
            channel = 'discord';
        }
    }

    // GeoIP resolution
    let geo = null;
    try {
        // filter out internal addresses for lookup but it's fine for geoip-lite
        geo = geoip.lookup(data.ip);
    } catch (e) {
        console.error('GeoIP lookup failed:', e);
    }
    const countryCode = geo?.country || null;

    if (!countryCode) {
        console.log(`Analytics: Could not resolve country for IP ${data.ip}`);
    }

    return (this.prisma as any).shopEvent.create({
      data: {
        sellerProfileId: seller.id,
        type: data.type as any,
        itemId: data.itemId,
        channel,
        referrer: data.referrer,
        ipHash,
        ip: data.ip, // Store raw IP for debugging as requested
        userAgent: data.userAgent,
        countryCode,
      },
    });
  }

  async getDashboardStats(userId: string, days: number = 7) {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      return {
        views: [],
        topItems: [],
        sources: [],
        topCountries: [],
        summary: { totalViews: 0, uniqueVisitors: 0, inquiries: 0, conversionRate: 0 },
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // 1. Fetch all events for the period
    const events = await (this.prisma as any).shopEvent.findMany({
      where: {
        sellerProfileId: seller.id,
        createdAt: { gte: startDate },
      },
      include: {
        item: {
          include: {
            cardVariant: { include: { card: true } },
            refPriceChartingProduct: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Aggregate data for Line Chart (Views over time)
    const viewsByDay = new Map<string, { date: string; views: number; unique: Set<string> }>();
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        viewsByDay.set(dayStr, { date: dayStr, views: 0, unique: new Set() });
    }

    (events as any[]).forEach((e) => {
        if (e.type === ShopEventType.VIEW_SHOP) {
            const day = e.createdAt.toISOString().split('T')[0];
            const stats = viewsByDay.get(day);
            if (stats) {
                stats.views++;
                if (e.ipHash) stats.unique.add(e.ipHash);
            }
        }
    });

    const viewsChartData = Array.from(viewsByDay.values())
        .map(v => ({ date: v.date, views: v.views, unique: v.unique.size }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Aggregate Top Items
    const itemsMap = new Map<string, { name: string; views: number }>();
    (events as any[]).forEach((e) => {
        if (e.type === ShopEventType.VIEW_ITEM && e.itemId) {
            const item = e.item as any;
            const name = item?.productName || item?.cardVariant?.card?.name || item?.refPriceChartingProduct?.title || 'Unknown Item';
            const stats = itemsMap.get(e.itemId) || { name, views: 0 };
            stats.views++;
            itemsMap.set(e.itemId, stats);
        }
    });

    const topItems = Array.from(itemsMap.values())
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

    // 4. Aggregate Sources
    const sourcesMap = new Map<string, number>();
    (events as any[]).forEach((e) => {
        if (e.type === ShopEventType.VIEW_SHOP) {
            let source = 'Direct';
            if (e.channel) {
                source = e.channel.charAt(0).toUpperCase() + e.channel.slice(1);
            } else if (e.referrer) {
                try {
                    const url = new URL(e.referrer);
                    const hostname = url.hostname.replace('www.', '');
                    
                    // Filter out internal referrers
                    if (hostname === 'slabhub.com' || hostname === 'localhost' || hostname.includes('netlify.app')) {
                        source = 'Direct';
                    } else {
                        source = hostname;
                    }
                } catch {
                    source = 'Direct';
                }
            }
            sourcesMap.set(source, (sourcesMap.get(source) || 0) + 1);
        }
    });

    const sources = Array.from(sourcesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // 5. Aggregate Countries
    const countriesMap = new Map<string, number>();
    (events as any[]).forEach((e) => {
        if (e.type === ShopEventType.VIEW_SHOP) {
            const countryCode = e.countryCode || 'Unknown';
            countriesMap.set(countryCode, (countriesMap.get(countryCode) || 0) + 1);
        }
    });

    const topCountries = Array.from(countriesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // 6. Summary Metrics
    const totalViews = (events as any[]).filter((e) => e.type === ShopEventType.VIEW_SHOP).length;
    const uniqueVisitors = new Set((events as any[]).filter((e) => e.type === ShopEventType.VIEW_SHOP).map((e) => e.ipHash)).size;
    const inquiries = (events as any[]).filter((e) => e.type === ShopEventType.INQUIRY_START).length;
    const conversionRate = totalViews > 0 ? (inquiries / totalViews) * 100 : 0;

    return {
      views: viewsChartData,
      topItems,
      sources,
      topCountries,
      summary: {
        totalViews,
        uniqueVisitors,
        inquiries,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
      },
    };
  }
}
