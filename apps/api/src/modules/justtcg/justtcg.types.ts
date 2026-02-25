export type JustTcgPaginationType = 'none' | 'page' | 'cursor' | 'offset';

export interface JustTcgFieldMapping {
    source: string;
    target: string;
    transform?: 'string' | 'number' | 'json' | 'date' | 'raw';
}

export interface JustTcgMapping {
    name: string;
    endpoint: string;
    pagination: JustTcgPaginationType;
    unique: {
        sourceField: string;
        targetField: string;
    };
    fields: JustTcgFieldMapping[];
    model: string;
    params?: Record<string, any>;
    limit?: number;
    concurrency?: number;
}

export interface JustTcgResponse<T = any> {
    data: T[];
    meta?: {
        total?: number;
        page?: number;
        lastPage?: number;
        nextCursor?: string;
        offset?: number;
        hasMore?: boolean;
    };
    _metadata?: {
        apiRequestLimit: number;
        apiDailyLimit: number;
        apiRateLimit: number;
        apiRequestsUsed: number;
        apiDailyRequestsUsed: number;
        apiRequestsRemaining: number;
        apiDailyRequestsRemaining: number;
        apiPlan: string;
    };
}
