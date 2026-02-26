import { JustTcgMapping } from './justtcg.types';

export const JUSTTCG_MAPPINGS: JustTcgMapping[] = [
    {
        name: 'games',
        endpoint: '/v1/games',
        pagination: 'page',
        unique: { sourceField: 'id', targetField: 'externalId' },
        model: 'RefGame',
        fields: [
            { source: 'id', target: 'externalId' },
            { source: 'name', target: 'name' },
            { source: 'slug', target: 'slug' },
            { source: 'updated_at', target: 'sourceUpdatedAt', transform: 'date' },
        ],
    },
    {
        name: 'sets',
        endpoint: '/v1/sets',
        pagination: 'offset',
        unique: { sourceField: 'id', targetField: 'externalId' },
        model: 'RefSet',
        params: { game: 'one-piece-card-game' },
        fields: [
            { source: 'id', target: 'externalId' },
            { source: 'name', target: 'name' },
            { source: 'code', target: 'code' },
            { source: 'slug', target: 'slug' },
            { source: 'game_id', target: 'gameExternalId' },
            { source: 'released_at', target: 'releaseDate', transform: 'date' },
            { source: 'updated_at', target: 'sourceUpdatedAt', transform: 'date' },
        ],
    },
    {
        name: 'catalog',
        endpoint: '/v1/cards',
        pagination: 'offset',
        unique: { sourceField: 'id', targetField: 'externalId' },
        model: 'RefProduct',
        params: { game: 'one-piece-card-game' },
        fields: [
            { source: 'id', target: 'externalId' },
            { source: 'name', target: 'name' },
            { source: 'number', target: 'number' },
            { source: 'image_url', target: 'imageUrl' },
            { source: 'tcgplayerId', target: 'tcgplayerId', transform: 'string' },
            { source: '*', target: 'justTcgData', transform: 'raw' },
            { source: 'set', target: 'setExternalId', transform: 'string' },
            { source: 'rarity', target: 'rarityExternalId' },
            { source: 'game', target: 'gameExternalId', transform: 'string' },
            // image_url is missing from top-level keys in this API version
        ],
        limit: 20,
        concurrency: 4,
    },
];
