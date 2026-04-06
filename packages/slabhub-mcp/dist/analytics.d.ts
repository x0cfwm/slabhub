import { PrismaClient } from '@prisma/client';
export declare class SlabhubAnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    getAnalyticsSummary(userId: string, days?: number): Promise<{
        views: {
            date: string;
            views: number;
            unique: number;
        }[];
        topItems: {
            name: string;
            views: number;
        }[];
        sources: {
            name: string;
            value: number;
        }[];
        topCountries: {
            name: string;
            value: number;
        }[];
        summary: {
            totalViews: number;
            uniqueVisitors: number;
            inquiries: number;
            conversionRate: number;
        };
    }>;
}
