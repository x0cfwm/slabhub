import { BadRequestException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    GradingRecognitionService,
    generateCardNumberCandidates,
} from '../../src/modules/grading/grading-recognition.service';
import { createPrismaMock } from '../mocks/prisma.mock';

type GeminiResponse = unknown;

function makeService(geminiQueue: GeminiResponse[], productsById: Record<string, any> = {}) {
    const configService: any = { get: jest.fn().mockReturnValue('key') };
    const prisma = createPrismaMock();
    prisma.refPriceChartingProduct.findMany.mockImplementation(async (args: any) => {
        const products = Object.values(productsById);
        const orClauses = args?.where?.OR as Array<{ cardNumber: { equals: string } }> | undefined;
        if (!orClauses) return products;
        const numbers = new Set(orClauses.map((c) => c.cardNumber.equals.toUpperCase()));
        return products.filter((p: any) => p.cardNumber && numbers.has(String(p.cardNumber).toUpperCase()));
    });

    const service = new GradingRecognitionService(configService as any, prisma);
    (service as any).genAI = {
        getGenerativeModel: jest.fn().mockImplementation(() => ({
            generateContent: jest.fn().mockImplementation(async () => {
                const next = geminiQueue.shift();
                if (next === undefined) throw new Error('Gemini queue exhausted');
                return { response: { text: () => JSON.stringify(next) } };
            }),
        })),
    };
    return { service, prisma };
}

function baseGeminiData(overrides: Partial<Record<string, any>> = {}) {
    return {
        success: true,
        data: {
            grader: 'PSA',
            certNumber: '12345678',
            gradeValue: '10',
            gradeLabel: 'GEM MT 10',
            cardName: 'Monkey D. Luffy',
            setName: 'Awakening of the New Era',
            rawCardNumber: 'OP05-119',
            language: 'English',
            rarity: 'SR',
            treatment: 'Normal',
            ...overrides,
        },
    };
}

function product(id: string, overrides: Partial<Record<string, any>> = {}) {
    return {
        id,
        title: overrides.title ?? 'Monkey D. Luffy [Normal]',
        cardNumber: overrides.cardNumber ?? 'OP05-119',
        imageUrl: overrides.imageUrl ?? null,
        productType: overrides.productType ?? 'SINGLE',
        rawPrice: overrides.rawPrice ?? null,
        grade7Price: null,
        grade8Price: null,
        grade9Price: null,
        grade95Price: null,
        grade10Price: null,
        sealedPrice: null,
        set: overrides.set ?? { name: 'Awakening of the New Era' },
    };
}

describe('generateCardNumberCandidates', () => {
    it('returns canonical forms for OP-style numbers', () => {
        const out = generateCardNumberCandidates('OP05-119');
        expect(out).toEqual(expect.arrayContaining(['OP05-119', 'OP05-0119', 'OP05119', 'OP050119']));
    });

    it('strips leading zeros and regenerates widths', () => {
        const out = generateCardNumberCandidates('OP09-0118');
        expect(out).toEqual(expect.arrayContaining(['OP09-118', 'OP09-0118']));
    });

    it('uppercases and trims input', () => {
        const out = generateCardNumberCandidates('  op05-119  ');
        expect(out).toContain('OP05-119');
    });

    it('handles compact form without dash', () => {
        const out = generateCardNumberCandidates('OP09118');
        expect(out).toEqual(expect.arrayContaining(['OP09-118', 'OP09118']));
    });

    it('falls back to cleaned input on unrecognized format', () => {
        expect(generateCardNumberCandidates('???')).toEqual(['???', '#???']);
    });

    it('never confuses OP01-001 with OP01-0018', () => {
        const out = generateCardNumberCandidates('OP01-001');
        expect(out).not.toContain('OP01-0018');
        expect(out).not.toContain('OP010018');
    });

    it('includes #-prefixed variants to match PriceCharting storage format', () => {
        const out = generateCardNumberCandidates('OP05-119');
        expect(out).toEqual(expect.arrayContaining(['#OP05-119', '#OP05119']));
    });

    it('strips a leading # from input and preserves it in output variants', () => {
        const out = generateCardNumberCandidates('#OP05-119');
        expect(out).toEqual(expect.arrayContaining(['OP05-119', '#OP05-119']));
    });
});

describe('GradingRecognitionService', () => {
    it('throws when GEMINI_API_KEY is missing', async () => {
        const configService = { get: jest.fn().mockReturnValue(undefined) };
        const service = new GradingRecognitionService(configService as any, createPrismaMock());
        await expect(service.recognizeFromImage(Buffer.from('x'), 'image/jpeg')).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('returns parsed response when no catalog match is found', async () => {
        const { service } = makeService([baseGeminiData({ rawCardNumber: 'XX99-999' })]);
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.success).toBe(true);
        expect(out.data?.refPriceChartingProductId).toBeUndefined();
        expect(out.data?.ambiguous).toBeFalsy();
        expect(out.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('auto-selects when exactly one product matches by normalized cardNumber', async () => {
        const { service } = makeService([baseGeminiData()], {
            p1: product('p1'),
        });
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.data?.refPriceChartingProductId).toBe('p1');
        expect(out.data?.productName).toBe('Monkey D. Luffy [Normal]');
        expect(out.data?.ambiguous).toBeFalsy();
    });

    it('does NOT match OP05-119 to an OP05-1190 product (exact, not substring)', async () => {
        const { service } = makeService([baseGeminiData()], {
            p1: product('p1', { cardNumber: 'OP05-1190' }),
        });
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.data?.refPriceChartingProductId).toBeUndefined();
    });

    it('matches across zero-padding variants (OP09-0118 in DB vs OP09-118 extracted)', async () => {
        const { service } = makeService([baseGeminiData({ rawCardNumber: 'OP09-118' })], {
            p1: product('p1', { cardNumber: 'OP09-0118' }),
        });
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.data?.refPriceChartingProductId).toBe('p1');
    });

    it('uses language as tie-break when disambiguation is uncertain', async () => {
        const { service } = makeService(
            [
                baseGeminiData({ language: 'English', treatment: 'Alt Art' }),
                { selectedId: '' },
            ],
            {
                en: product('en', { title: 'Monkey D. Luffy [Alt Art]' }),
                jp: product('jp', { title: 'Monkey D. Luffy [Alt Art] Japanese' }),
            },
        );
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.data?.refPriceChartingProductId).toBe('en');
        expect(out.data?.ambiguous).toBeFalsy();
    });

    it('does NOT pre-filter by language — sends both EN and JP variants to disambiguation', async () => {
        let disambigCandidateCount = 0;
        const { service } = makeService(
            [
                baseGeminiData({ language: 'Japanese', treatment: 'Manga' }),
                // disambiguation LLM picks the EN one despite first-pass saying Japanese
                { selectedId: 'en' },
            ],
            {
                en: product('en', { title: 'Luffy [Manga] Emperors in the New World' }),
                jp: product('jp', { title: 'Luffy [Manga] Japanese Emperors in the New World' }),
            },
        );
        const originalDisambig = (service as any).disambiguateWithImages.bind(service);
        (service as any).disambiguateWithImages = async (products: any[], ...rest: any[]) => {
            disambigCandidateCount = products.length;
            return originalDisambig(products, ...rest);
        };
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(disambigCandidateCount).toBe(2);
        expect(out.data?.refPriceChartingProductId).toBe('en');
    });

    it('returns ambiguous + candidates when disambiguation LLM gives empty selectedId', async () => {
        const { service } = makeService(
            [
                baseGeminiData({ treatment: 'Alt Art' }),
                { selectedId: '' },
            ],
            {
                a: product('a', { title: 'Luffy [Alt Art]' }),
                b: product('b', { title: 'Luffy [Alt Art] Parallel' }),
            },
        );
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.data?.ambiguous).toBe(true);
        expect(out.data?.refPriceChartingProductId).toBeUndefined();
        expect(out.data?.candidates).toHaveLength(2);
        expect(out.data?.candidates?.map((c) => c.id).sort()).toEqual(['a', 'b']);
    });

    it('applies disambiguation pick when LLM returns a valid id', async () => {
        const { service } = makeService(
            [
                baseGeminiData({ treatment: 'Alt Art' }),
                { selectedId: 'b' },
            ],
            {
                a: product('a', { title: 'Luffy [Alt Art]' }),
                b: product('b', { title: 'Luffy [Alt Art] Parallel' }),
            },
        );
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.data?.refPriceChartingProductId).toBe('b');
        expect(out.data?.ambiguous).toBeFalsy();
    });

    it('falls back to ambiguous when disambiguation returns unknown id', async () => {
        const { service } = makeService(
            [baseGeminiData(), { selectedId: 'ghost' }],
            {
                a: product('a', { title: 'Luffy [Alt Art]' }),
                b: product('b', { title: 'Luffy [Alt Art] Parallel' }),
            },
        );
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.data?.ambiguous).toBe(true);
        expect(out.data?.refPriceChartingProductId).toBeUndefined();
    });

    it('does NOT expose telemetry on the HTTP response', async () => {
        const { service } = makeService([baseGeminiData()], { p1: product('p1') });
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect((out as any).telemetry).toBeUndefined();
    });

    it('captures step-by-step telemetry in the persisted trace (single match path)', async () => {
        const { service, prisma } = makeService([baseGeminiData()], { p1: product('p1') });
        await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');

        const args = prisma.gradingRecognitionTrace.create.mock.calls[0][0];
        const steps: Array<{ name: string; input?: any; output?: any }> = args.data.steps;
        const names = steps.map((s) => s.name);
        expect(names).toEqual([
            'preprocess',
            'gemini-extract',
            'normalize-card-number',
            'db-lookup',
            'treatment-filter',
            'decision',
        ]);

        const extract = steps.find((s) => s.name === 'gemini-extract');
        expect(extract?.output).toMatchObject({
            success: true,
            rawCardNumber: 'OP05-119',
            language: 'English',
            treatment: 'Normal',
        });

        const normalize = steps.find((s) => s.name === 'normalize-card-number');
        expect(normalize?.input).toEqual({ rawCardNumber: 'OP05-119' });
        expect(normalize?.output.candidates).toEqual(
            expect.arrayContaining(['OP05-119', '#OP05-119']),
        );

        const dbLookup = steps.find((s) => s.name === 'db-lookup');
        expect(dbLookup?.output.matchedCount).toBe(1);

        const decision = steps.find((s) => s.name === 'decision');
        expect(decision?.input).toEqual({ reason: 'single-candidate-after-filters' });
        expect(decision?.output.productId).toBe('p1');
    });

    it('persists a trace row with denormalized fields + full steps JSON', async () => {
        const { service, prisma } = makeService([baseGeminiData()], { p1: product('p1') });
        await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg', { userId: 'u-1' });

        expect(prisma.gradingRecognitionTrace.create).toHaveBeenCalledTimes(1);
        const args = prisma.gradingRecognitionTrace.create.mock.calls[0][0];
        expect(args.data.userId).toBe('u-1');
        expect(args.data.success).toBe(true);
        expect(args.data.rawCardNumber).toBe('OP05-119');
        expect(args.data.language).toBe('English');
        expect(args.data.treatment).toBe('Normal');
        expect(args.data.grader).toBe('PSA');
        expect(args.data.decisionReason).toBe('single-candidate-after-filters');
        expect(args.data.matchedProductId).toBe('p1');
        expect(args.data.ambiguous).toBe(false);
        expect(Array.isArray(args.data.steps)).toBe(true);
        expect(args.data.steps.map((s: any) => s.name)).toContain('gemini-extract');
    });

    it('persists trace without throwing when DB write fails', async () => {
        const { service, prisma } = makeService([baseGeminiData()], { p1: product('p1') });
        prisma.gradingRecognitionTrace.create.mockRejectedValueOnce(new Error('db down'));
        const out = await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');
        expect(out.success).toBe(true);
        expect(out.data?.refPriceChartingProductId).toBe('p1');
    });

    it('records disambiguation and language-tiebreak steps in persisted trace when taken', async () => {
        const { service, prisma } = makeService(
            [
                baseGeminiData({ language: 'English', treatment: 'Alt Art' }),
                { selectedId: '' },
            ],
            {
                en: product('en', { title: 'Luffy [Alt Art]' }),
                jp: product('jp', { title: 'Luffy [Alt Art] Japanese' }),
            },
        );
        await service.recognizeFromImage(Buffer.from('x'), 'image/jpeg');

        const args = prisma.gradingRecognitionTrace.create.mock.calls[0][0];
        const steps: Array<{ name: string; input?: any; output?: any }> = args.data.steps;
        const names = steps.map((s) => s.name);
        expect(names).toContain('disambiguation');
        expect(names).toContain('language-tiebreak');

        const disambig = steps.find((s) => s.name === 'disambiguation');
        expect((disambig?.input.candidates as any[]).map((c) => c.id).sort()).toEqual(['en', 'jp']);
        expect(disambig?.output).toEqual({ selectedId: '' });

        const disambigLlm = steps.find((s) => s.name === 'disambiguation.llm');
        expect(disambigLlm).toBeDefined();
        expect(disambigLlm?.input).toMatchObject({ model: expect.any(String) });
        expect(disambigLlm?.output).toEqual({ selectedId: '' });
        expect(disambigLlm!.durationMs).toBeLessThanOrEqual(disambig!.durationMs);

        const tieBreak = steps.find((s) => s.name === 'language-tiebreak');
        expect(tieBreak?.input).toMatchObject({ language: 'English', inCount: 2 });
        expect(tieBreak?.output.outCount).toBe(1);

        const decision = steps.find((s) => s.name === 'decision');
        expect(decision?.input).toEqual({ reason: 'language-tiebreak-single' });
    });
});

const E2E_ENABLED = process.env.GEMINI_E2E === '1' && !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== '';
const describeE2E = E2E_ENABLED ? describe : describe.skip;
const TESTS_DIR = path.resolve(__dirname, '../../../../tests');

function normalizeForCompare(s: string): string {
    const cleaned = s.trim().toUpperCase().replace(/\s+/g, '');
    const m = cleaned.match(/^([A-Z]+\d{0,2})-?(\d+)$/);
    if (!m) return cleaned;
    const digits = m[2].replace(/^0+/, '') || '0';
    return `${m[1]}-${digits}`;
}

describeE2E('GradingRecognitionService — real images (E2E, set GEMINI_E2E=1 to enable)', () => {
    const files = fs.existsSync(TESTS_DIR)
        ? fs.readdirSync(TESTS_DIR).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        : [];

    if (files.length === 0) {
        it.skip('no images found in tests/', () => undefined);
        return;
    }

    it.each(files)(
        'extracts rawCardNumber matching filename for %s',
        async (fileName: string) => {
            const configService: any = {
                get: jest.fn().mockImplementation((k: string) =>
                    k === 'GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : undefined,
                ),
            };
            const prisma = createPrismaMock();
            prisma.refPriceChartingProduct.findMany.mockResolvedValue([]);
            const service = new GradingRecognitionService(configService, prisma);

            const buffer = fs.readFileSync(path.join(TESTS_DIR, fileName));
            const result = await service.recognizeFromImage(buffer, 'image/jpeg');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();

            const expected = normalizeForCompare(fileName.replace(/\.[^.]+$/, ''));
            const actual = normalizeForCompare(result.data?.rawCardNumber || '');
            expect(actual).toBe(expected);
        },
        60_000,
    );

    // Regression: for the English Manga OP09-118 card, first-pass Gemini may misclassify
    // the language as Japanese. The disambiguation step (with real candidate images) must
    // still pick the English variant, not a Japanese-titled one.
    const op09Fixture = fs.existsSync(path.join(TESTS_DIR, 'OP09-118.jpg'))
        ? 'OP09-118.jpg'
        : null;
    const maybeIt = op09Fixture ? it : it.skip;
    maybeIt(
        'picks the English Manga variant for OP09-118.jpg despite language ambiguity',
        async () => {
            const configService: any = {
                get: jest.fn().mockImplementation((k: string) =>
                    k === 'GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : undefined,
                ),
            };
            const prisma = createPrismaMock();
            const op09Products = [
                { id: 'jp-wanted', title: 'Gol.D.Roger [Wanted] OP09-118 One Piece Japanese Carrying on His Will' },
                { id: 'en-manga', title: 'Gol.D.Roger [Manga] OP09-118 One Piece Emperors in the New World' },
                { id: 'en-foil', title: 'Gol.D.Roger [Foil] OP09-118 One Piece Emperors in the New World' },
                { id: 'en-alt', title: 'Gol.D.Roger [Alternate Art] OP09-118 One Piece Emperors in the New World' },
                { id: 'jp-manga', title: 'Gol.D.Roger [Manga] OP09-118 One Piece Japanese Emperors in the New World' },
                { id: 'jp-alt', title: 'Gol.D.Roger [Alternate Art] OP09-118 One Piece Japanese Emperors in the New World' },
                { id: 'jp-foil', title: 'Gol.D.Roger [Foil] OP09-118 One Piece Japanese Emperors in the New World' },
                { id: 'en-wanted', title: 'Gol.D.Roger [Wanted] OP09-118 One Piece Carrying on His Will' },
            ].map((p) => ({
                id: p.id,
                title: p.title,
                cardNumber: '#OP09-118',
                imageUrl: null,
                productType: 'SINGLE_CARD',
                rawPrice: null,
                grade7Price: null,
                grade8Price: null,
                grade9Price: null,
                grade95Price: null,
                grade10Price: null,
                sealedPrice: null,
                set: { name: 'Emperors in the New World' },
            }));
            prisma.refPriceChartingProduct.findMany.mockResolvedValue(op09Products);
            const service = new GradingRecognitionService(configService, prisma);

            const buffer = fs.readFileSync(path.join(TESTS_DIR, op09Fixture as string));
            const result = await service.recognizeFromImage(buffer, 'image/jpeg');

            expect(result.success).toBe(true);
            const picked = result.data?.productName || '';
            expect(picked).not.toMatch(/japanese/i);
            expect(picked).toMatch(/Manga/i);
        },
        90_000,
    );
});
