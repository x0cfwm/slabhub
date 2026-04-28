import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType, Part } from '@google/generative-ai';
import { Prisma } from '@prisma/client';
import {
    GradingRecognitionCandidate,
    GradingRecognitionResult,
    GradingRecognitionStep,
    GradingRecognitionTelemetry,
} from './types/grading.types';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

const DISAMBIGUATION_IMAGE_LIMIT = 8;

type MatchedProduct = Prisma.RefPriceChartingProductGetPayload<{ include: { set: true } }>;

class TelemetryRecorder {
    private readonly startedAt = Date.now();
    private readonly steps: GradingRecognitionStep[] = [];

    step(
        name: string,
        startedAt: number,
        input: Record<string, unknown> | undefined,
        output: Record<string, unknown> | undefined,
        error?: string,
    ): void {
        this.steps.push({
            name,
            durationMs: Date.now() - startedAt,
            input,
            output,
            error,
        });
    }

    async track<T>(
        name: string,
        input: Record<string, unknown> | undefined,
        fn: () => Promise<T> | T,
        outputMapper?: (result: T) => Record<string, unknown>,
    ): Promise<T> {
        const start = Date.now();
        try {
            const result = await fn();
            this.step(name, start, input, outputMapper ? outputMapper(result) : undefined);
            return result;
        } catch (err: any) {
            this.step(name, start, input, undefined, err?.message || String(err));
            throw err;
        }
    }

    build(): GradingRecognitionTelemetry {
        return {
            startedAt: new Date(this.startedAt).toISOString(),
            durationMs: Date.now() - this.startedAt,
            steps: this.steps,
        };
    }
}

@Injectable()
export class GradingRecognitionService {
    private readonly logger = new Logger(GradingRecognitionService.name);
    private readonly genAI: GoogleGenerativeAI | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        } else {
            this.logger.warn('GEMINI_API_KEY not found. Image recognition will be disabled.');
        }
    }

    async recognizeFromImage(
        buffer: Buffer,
        mimeType: string,
        opts: { userId?: string } = {},
    ): Promise<GradingRecognitionResult> {
        if (!this.genAI) {
            throw new BadRequestException('Image recognition is not configured (missing GEMINI_API_KEY)');
        }

        const recognitionModel =
            this.configService.get<string>('GEMINI_RECOGNITION_MODEL') ?? 'gemini-2.5-flash-lite';
        const modelNames = [recognitionModel];
        const disambiguationModelName = recognitionModel;

        let lastError: Error | null = null;
        const startTime = Date.now();
        let processingBuffer = buffer;
        let processingMimeType = mimeType;

        const telemetry = new TelemetryRecorder();
        const preprocessStart = Date.now();
        let originalWidth: number | undefined;
        let originalHeight: number | undefined;
        let resized = false;

        try {
            const image = sharp(buffer);
            const metadata = await image.metadata();
            originalWidth = metadata.width;
            originalHeight = metadata.height;

            if (metadata.width && metadata.height && (metadata.width > 1280 || metadata.height > 1280)) {
                this.logger.debug(`Resizing image from ${metadata.width}x${metadata.height} to max 1280px`);
                processingBuffer = await image
                    .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toBuffer();
                processingMimeType = 'image/jpeg';
                resized = true;
                this.logger.debug(`Reduced size from ${buffer.length} to ${processingBuffer.length} bytes`);
            }
            telemetry.step(
                'preprocess',
                preprocessStart,
                { bytes: buffer.length, mimeType, width: originalWidth, height: originalHeight },
                { bytes: processingBuffer.length, mimeType: processingMimeType, resized },
            );
        } catch (e) {
            this.logger.warn(`Failed to process/resize image: ${e.message}. Using original.`);
            telemetry.step(
                'preprocess',
                preprocessStart,
                { bytes: buffer.length, mimeType },
                { bytes: buffer.length, mimeType, resized: false, fallback: true },
                e?.message,
            );
        }

        const base64Data = processingBuffer.toString('base64');

        for (const modelName of modelNames) {
            try {
                this.logger.debug(`Attempting recognition with model: ${modelName}`);
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: SchemaType.OBJECT,
                            properties: {
                                success: { type: SchemaType.BOOLEAN },
                                data: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        grader: { type: SchemaType.STRING, description: 'Grader name (PSA, BGS, OTHER)' },
                                        certNumber: { type: SchemaType.STRING, description: 'Certification number (PSA/BGS cert)' },
                                        certificationNumber: { type: SchemaType.STRING, description: 'Slab certification / cert number from the grading label only' },
                                        gradeLabel: { type: SchemaType.STRING, description: 'Full grade label (e.g. PRISTINE 10, GEM MT 10)' },
                                        gradeValue: { type: SchemaType.STRING, description: 'Numeric grade value (e.g. 10, 9.5)' },
                                        subgrades: {
                                            type: SchemaType.OBJECT,
                                            properties: {
                                                centering: { type: SchemaType.STRING },
                                                corners: { type: SchemaType.STRING },
                                                edges: { type: SchemaType.STRING },
                                                surface: { type: SchemaType.STRING },
                                            }
                                        },
                                        cardName: { type: SchemaType.STRING, description: 'Name of the character/card' },
                                        setName: { type: SchemaType.STRING, description: 'Specific set/expansion name (subtitle), e.g. "Awakening of the New Era", "Emperors in the New World" — NOT just "One Piece"' },
                                        rawCardNumber: { type: SchemaType.STRING, description: 'Full printed card number including set prefix (e.g. OP05-119, EB01-001)' },
                                        language: { type: SchemaType.STRING, description: 'Language of the card (English or Japanese)' },
                                        year: { type: SchemaType.STRING, description: 'Year of release' },
                                        rarity: { type: SchemaType.STRING, description: 'Printed rarity code: C, UC, R, SR, SEC, L, P, SP, M, or empty if not visible' },
                                        treatment: { type: SchemaType.STRING, description: 'Visual variant: Normal, Alt Art, Manga Rare, Parallel, Promo Stamp, Pre-release Stamp, Foil. Use Normal if base print.' },
                                    },
                                    required: ['grader', 'certNumber', 'gradeValue', 'cardName', 'setName', 'rawCardNumber', 'language'],
                                },
                            },
                        },
                    },
                });

                const prompt = `
                    You are an expert in trading cards specializing in One Piece and Pokemon.
                    Extract card and grading information from this image.
                    Focus on the grading label (usually at the top) and the card itself.
                    The grader might be PSA, BGS or OTHER.

                    IMPORTANT PARSING RULES:

                    1. rawCardNumber
                    Extract the FULL exact card number printed on the card exactly as it appears.
                    Examples: "OP05-119", "OP09-0118", "ST01-001".
                    Do NOT remove the set prefix (like OP05). Return the exact alphanumeric string.

                    2. cardName
                    Return the full card name exactly as printed.

                    2a. setName
                    Return the specific set/expansion name. The card or slab usually shows the set's subtitle in small text near the card number, the booster pack art, or on the grading label.
                    Examples (One Piece TCG): "Awakening of the New Era", "Emperors in the New World", "Fist of Divine Speed", "Legacy of the Master", "Carrying on His Will", "500 Years in the Future", "Memorial Collection".
                    DO NOT return just "One Piece" or "One Piece TCG" alone — that's the game name, not the set name. If you cannot read the specific set name, return an empty string instead of a generic placeholder.

                    3. certificationNumber
                    Extract the slab certification / cert number from the grading label only.
                    Do not infer it from the card. Do not confuse it with the card number.

                    4. language (BE CAREFUL — look for SPECIFIC evidence, do not guess from art alone)
                    Identify the language of the card. Only return "Japanese" if you see at least one of:
                      - Japanese copyright near the bottom-right of the card frame: "©尾田栄一郎/集英社" or similar kanji/katakana characters
                      - Hiragana/katakana/kanji inside the card name, effect text box, or flavor text
                      - Japanese-language rarity or keyword text (e.g. 必殺技, 登場)
                    Otherwise return "English". English cards show Latin-alphabet effect text and "©Eiichiro Oda/Shueisha, Toei Animation".
                    Manga Rare cards are black-and-white and can be printed in either language — do NOT assume "Japanese" just because the art is monochrome. Check the text and copyright carefully.
                    Common values: "English", "Japanese".

                    5. rarity
                    Read the printed rarity symbol near the card number (e.g. C, UC, R, SR, SEC, L, P, SP, M).
                    Return the exact printed code. Empty string if not visible.

                    6. treatment (CRITICAL for variant disambiguation)
                    Identify the visual variant:
                    - "Alt Art": alternate artwork version (different illustration than base print)
                    - "Manga Rare": black-and-white manga-style art
                    - "Parallel": standard art but with foil/holo parallel treatment
                    - "Promo Stamp": has a promo/event stamp on the art
                    - "Pre-release Stamp": has a pre-release stamp
                    - "Foil": full-art foil treatment
                    - "Normal": standard base print with no special treatment
                    Pick exactly one. When unsure, prefer "Normal".

                    Examples:
                    - BGS label "... 0018431564" -> certificationNumber = "0018431564"
                    - PSA label "... Cert 12345678" -> certificationNumber = "12345678"

                    Return the result in the specified JSON format.
                `;

                const extractStart = Date.now();
                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: processingMimeType,
                        },
                    },
                ]);

                const responseText = result.response.text();
                this.logger.log(`[DEBUG] Gemini response: ${responseText}`);

                const parsed = JSON.parse(responseText) as GradingRecognitionResult;
                telemetry.step(
                    'gemini-extract',
                    extractStart,
                    { model: modelName, promptLen: prompt.length, imageBytes: processingBuffer.length },
                    {
                        success: parsed.success,
                        grader: parsed.data?.grader,
                        cardName: parsed.data?.cardName,
                        rawCardNumber: parsed.data?.rawCardNumber,
                        setName: parsed.data?.setName,
                        language: parsed.data?.language,
                        rarity: parsed.data?.rarity,
                        treatment: parsed.data?.treatment,
                        certNumber: parsed.data?.certNumber,
                        gradeLabel: parsed.data?.gradeLabel,
                        gradeValue: parsed.data?.gradeValue,
                    },
                );

                if (parsed.success && parsed.data) {
                    const { rawCardNumber, language, treatment, setName } = parsed.data;
                    if (rawCardNumber) {
                        try {
                            const normStart = Date.now();
                            const numberCandidates = generateCardNumberCandidates(rawCardNumber);
                            telemetry.step(
                                'normalize-card-number',
                                normStart,
                                { rawCardNumber },
                                { candidates: numberCandidates },
                            );
                            this.logger.debug(`Lookup cardNumber candidates: ${numberCandidates.join(', ')}`);

                            const dbStart = Date.now();
                            let matchedProducts = await this.prisma.refPriceChartingProduct.findMany({
                                where: {
                                    OR: numberCandidates.map((c) => ({
                                        cardNumber: { equals: c, mode: 'insensitive' as const },
                                    })),
                                },
                                include: { set: true },
                            });
                            telemetry.step(
                                'db-lookup',
                                dbStart,
                                { candidates: numberCandidates },
                                {
                                    matchedCount: matchedProducts.length,
                                    matches: matchedProducts.map((p) => ({
                                        id: p.id,
                                        title: p.title,
                                        cardNumber: p.cardNumber,
                                    })),
                                },
                            );

                            const treatmentStart = Date.now();
                            const beforeTreatment = matchedProducts.length;
                            matchedProducts = this.applyTreatmentFilter(matchedProducts, treatment);
                            telemetry.step(
                                'treatment-filter',
                                treatmentStart,
                                { treatment, inCount: beforeTreatment },
                                {
                                    outCount: matchedProducts.length,
                                    kept: matchedProducts.map((p) => ({ id: p.id, title: p.title })),
                                },
                            );

                            const setNameStart = Date.now();
                            const beforeSetName = matchedProducts.length;
                            const setNameTokens = extractSetNameTokens(setName);
                            matchedProducts = this.applySetNameFilter(matchedProducts, setNameTokens);
                            telemetry.step(
                                'set-name-filter',
                                setNameStart,
                                { setName, tokens: setNameTokens, inCount: beforeSetName },
                                {
                                    outCount: matchedProducts.length,
                                    kept: matchedProducts.map((p) => ({ id: p.id, title: p.title })),
                                },
                            );

                            if (matchedProducts.length === 1) {
                                this.applyMatch(parsed, matchedProducts[0]);
                                telemetry.step(
                                    'decision',
                                    Date.now(),
                                    { reason: 'single-candidate-after-filters' },
                                    { productId: matchedProducts[0].id, productName: matchedProducts[0].title },
                                );
                            } else if (matchedProducts.length > 1) {
                                this.logger.debug(
                                    `Found ${matchedProducts.length} candidates for cardNumber=${rawCardNumber} after treatment filter. Running image-based disambiguation.`,
                                );
                                const top = matchedProducts.slice(0, DISAMBIGUATION_IMAGE_LIMIT);

                                const selectedId = await this.disambiguateWithImages(
                                    top,
                                    parsed,
                                    base64Data,
                                    processingMimeType,
                                    disambiguationModelName,
                                    telemetry,
                                );

                                if (selectedId) {
                                    const picked = top.find((p) => p.id === selectedId);
                                    if (picked) {
                                        this.applyMatch(parsed, picked);
                                        telemetry.step(
                                            'decision',
                                            Date.now(),
                                            { reason: 'disambiguation-pick' },
                                            { productId: picked.id, productName: picked.title },
                                        );
                                    } else {
                                        this.logger.warn(
                                            `Disambiguation returned unknown id=${selectedId}; applying language tie-break.`,
                                        );
                                        this.tieBreakOrAmbiguous(parsed, top, language, telemetry);
                                    }
                                } else {
                                    this.tieBreakOrAmbiguous(parsed, top, language, telemetry);
                                }
                            } else {
                                this.logger.debug(`No PriceCharting product found for ${rawCardNumber}`);
                                telemetry.step(
                                    'decision',
                                    Date.now(),
                                    { reason: 'no-catalog-match' },
                                    {},
                                );
                            }
                        } catch (lookupError) {
                            this.logger.warn(`PriceCharting lookup failed: ${lookupError.message}`);
                            telemetry.step(
                                'decision',
                                Date.now(),
                                { reason: 'lookup-error' },
                                {},
                                lookupError?.message,
                            );
                        }
                    } else {
                        telemetry.step(
                            'decision',
                            Date.now(),
                            { reason: 'no-card-number-extracted' },
                            {},
                        );
                    }
                }

                const built = telemetry.build();
                this.logger.log(`[telemetry] ${JSON.stringify(built)}`);
                const successResponse: GradingRecognitionResult = {
                    ...parsed,
                    durationMs: Date.now() - startTime,
                };
                await this.persistTrace(successResponse, built, opts.userId);
                return successResponse;
            } catch (error) {
                this.logger.warn(`Model ${modelName} failed: ${error.message}`);
                lastError = error;
                telemetry.step(
                    'gemini-extract',
                    Date.now(),
                    { model: modelName },
                    undefined,
                    error?.message,
                );
                if (error.message.includes('429')) {
                    break;
                }
                continue;
            }
        }

        const builtFail = telemetry.build();
        this.logger.log(`[telemetry] ${JSON.stringify(builtFail)}`);
        const failResponse: GradingRecognitionResult = {
            success: false,
            error: lastError?.message || 'Recognition failed with all attempted models',
            durationMs: Date.now() - startTime,
        };
        await this.persistTrace(failResponse, builtFail, opts.userId);
        return failResponse;
    }

    private async persistTrace(
        result: GradingRecognitionResult,
        telemetry: GradingRecognitionTelemetry,
        userId: string | undefined,
    ): Promise<void> {
        try {
            const decisionStep = [...telemetry.steps].reverse().find((s) => s.name === 'decision');
            const decisionReason = (decisionStep?.input as any)?.reason as string | undefined;

            await this.prisma.gradingRecognitionTrace.create({
                data: {
                    userId: userId ?? null,
                    durationMs: telemetry.durationMs,
                    success: result.success,
                    error: result.error ?? null,
                    rawCardNumber: result.data?.rawCardNumber ?? null,
                    language: result.data?.language ?? null,
                    treatment: result.data?.treatment ?? null,
                    grader: (result.data?.grader as string | undefined) ?? null,
                    decisionReason: decisionReason ?? null,
                    matchedProductId: result.data?.refPriceChartingProductId ?? null,
                    ambiguous: !!result.data?.ambiguous,
                    candidateCount: result.data?.candidates?.length ?? null,
                    steps: telemetry.steps as unknown as Prisma.InputJsonValue,
                },
            });
        } catch (err: any) {
            this.logger.warn(`Failed to persist recognition trace: ${err?.message || err}`);
        }
    }

    private applySetNameFilter(products: MatchedProduct[], tokens: string[]): MatchedProduct[] {
        if (tokens.length === 0) {return products;}
        const matchesAll = (haystack: string) => {
            const h = haystack.toLowerCase();
            return tokens.every((t) => h.includes(t));
        };
        const matchesAny = (haystack: string) => {
            const h = haystack.toLowerCase();
            return tokens.some((t) => h.includes(t));
        };
        const haystack = (p: MatchedProduct) => `${p.set?.name || ''} ${p.title || ''}`;
        const strict = products.filter((p) => matchesAll(haystack(p)));
        if (strict.length > 0) {return strict;}
        const loose = products.filter((p) => matchesAny(haystack(p)));
        return loose.length > 0 ? loose : products;
    }

    private applyTreatmentFilter(products: MatchedProduct[], treatment?: string): MatchedProduct[] {
        if (!treatment) {return products;}
        let pool = products;
        const t = treatment.toLowerCase();
        const hints: { keyword: RegExp; positive: boolean }[] = [];
        if (t.includes('alt')) {hints.push({ keyword: /alt.?art/i, positive: true });}
        else if (t.includes('manga')) {hints.push({ keyword: /manga/i, positive: true });}
        else if (t.includes('parallel')) {hints.push({ keyword: /parallel|foil/i, positive: true });}
        else if (t.includes('pre-release') || t.includes('prerelease')) {hints.push({ keyword: /pre.?release/i, positive: true });}
        else if (t.includes('promo') && t.includes('stamp')) {hints.push({ keyword: /promo.*stamp|stamp/i, positive: true });}
        else if (t === 'normal') {hints.push({ keyword: /alt.?art|manga|parallel|pre.?release|stamp/i, positive: false });}

        for (const h of hints) {
            const narrowed = pool.filter((p) => {
                const has = h.keyword.test(p.title || '');
                return h.positive ? has : !has;
            });
            if (narrowed.length > 0) {pool = narrowed;}
        }
        return pool;
    }

    private applyLanguageFilter(products: MatchedProduct[], language?: string): MatchedProduct[] {
        if (!language) {return products;}
        const lang = language.toLowerCase();
        if (lang.startsWith('japan') || lang === 'jp') {
            const narrowed = products.filter((p) => /japan/i.test(p.title || ''));
            return narrowed.length > 0 ? narrowed : products;
        }
        if (lang.startsWith('eng') || lang === 'en') {
            const narrowed = products.filter((p) => !/japan/i.test(p.title || ''));
            return narrowed.length > 0 ? narrowed : products;
        }
        return products;
    }

    private tieBreakOrAmbiguous(
        parsed: GradingRecognitionResult,
        products: MatchedProduct[],
        language: string | undefined,
        telemetry: TelemetryRecorder,
    ): void {
        const start = Date.now();
        const narrowed = this.applyLanguageFilter(products, language);
        telemetry.step(
            'language-tiebreak',
            start,
            { language, inCount: products.length },
            {
                outCount: narrowed.length,
                kept: narrowed.map((p) => ({ id: p.id, title: p.title })),
            },
        );

        if (narrowed.length === 1) {
            this.logger.debug(`Language tie-break collapsed pool to 1 candidate; selecting.`);
            this.applyMatch(parsed, narrowed[0]);
            telemetry.step(
                'decision',
                Date.now(),
                { reason: 'language-tiebreak-single' },
                { productId: narrowed[0].id, productName: narrowed[0].title },
            );
            return;
        }
        const pool = narrowed.length > 0 ? narrowed : products;
        this.applyAmbiguous(parsed, pool);
        telemetry.step(
            'decision',
            Date.now(),
            { reason: 'ambiguous' },
            { candidateCount: pool.length, ids: pool.map((p) => p.id) },
        );
    }

    private applyMatch(parsed: GradingRecognitionResult, product: MatchedProduct): void {
        if (!parsed.data) {return;}
        this.logger.debug(`Selected product: ${product.title} (${product.id})`);
        parsed.data.refPriceChartingProductId = product.id;
        parsed.data.productName = product.title || undefined;
        parsed.data.productSet = product.set?.name || undefined;
        parsed.data.productNumber = product.cardNumber || undefined;
        parsed.data.productImageUrl = (product.imageUrl as string) || undefined;
        if (product.rawPrice) {parsed.data.marketPrice = Number(product.rawPrice);}
        if (product.grade7Price) {parsed.data.grade7Price = Number(product.grade7Price);}
        if (product.grade8Price) {parsed.data.grade8Price = Number(product.grade8Price);}
        if (product.grade9Price) {parsed.data.grade9Price = Number(product.grade9Price);}
        if (product.grade95Price) {parsed.data.grade95Price = Number(product.grade95Price);}
        if (product.grade10Price) {parsed.data.grade10Price = Number(product.grade10Price);}
        if (product.sealedPrice) {parsed.data.sealedPrice = Number(product.sealedPrice);}
    }

    private applyAmbiguous(parsed: GradingRecognitionResult, products: MatchedProduct[]): void {
        if (!parsed.data) {return;}
        parsed.data.ambiguous = true;
        parsed.data.candidates = products.map<GradingRecognitionCandidate>((p) => ({
            id: p.id,
            title: p.title || undefined,
            set: p.set?.name || undefined,
            cardNumber: p.cardNumber || undefined,
            imageUrl: (p.imageUrl as string) || undefined,
            productType: p.productType || undefined,
            rawPrice: p.rawPrice ? Number(p.rawPrice) : undefined,
            grade7Price: p.grade7Price ? Number(p.grade7Price) : undefined,
            grade8Price: p.grade8Price ? Number(p.grade8Price) : undefined,
            grade9Price: p.grade9Price ? Number(p.grade9Price) : undefined,
            grade95Price: p.grade95Price ? Number(p.grade95Price) : undefined,
            grade10Price: p.grade10Price ? Number(p.grade10Price) : undefined,
            sealedPrice: p.sealedPrice ? Number(p.sealedPrice) : undefined,
        }));
    }

    private async disambiguateWithImages(
        products: MatchedProduct[],
        parsed: GradingRecognitionResult,
        targetImageBase64: string,
        targetMimeType: string,
        modelName: string,
        telemetry: TelemetryRecorder,
    ): Promise<string | null> {
        if (!this.genAI || !parsed.data) {return null;}

        const parts: Part[] = [];
        parts.push({
            text:
                `You previously extracted from the target card image:\n` +
                `- Card Name: "${parsed.data.cardName || ''}"\n` +
                `- Card Number: "${parsed.data.rawCardNumber || ''}"\n` +
                `- Language: "${parsed.data.language || ''}"\n` +
                `- Rarity: "${parsed.data.rarity || ''}"\n` +
                `- Treatment: "${parsed.data.treatment || ''}"\n\n` +
                `Below is the target card photo, then ${products.length} candidate products. ` +
                `Match by artwork, border, text layout, language, and treatment (alt art vs normal vs parallel vs stamp). ` +
                `Only choose a candidate if you are confident in an exact visual match. ` +
                `Return JSON with "selectedId" set to the exact id, or empty string if uncertain.`,
        });
        parts.push({ text: 'TARGET CARD:' });
        parts.push({
            inlineData: { data: targetImageBase64, mimeType: targetMimeType },
        });

        products.forEach((p, idx) => {
            parts.push({
                text:
                    `CANDIDATE ${idx + 1}:\n` +
                    `id: ${p.id}\n` +
                    `title: ${p.title || ''}\n` +
                    `set: ${p.set?.name || ''}\n` +
                    `cardNumber: ${p.cardNumber || ''}\n` +
                    `productType: ${p.productType || ''}`,
            });
            if (p.imageUrl) {
                parts.push({
                    fileData: {
                        fileUri: p.imageUrl as string,
                        mimeType: inferImageMimeFromUrl(p.imageUrl as string),
                    },
                });
            }
        });

        const llmStart = Date.now();
        const imageParts = parts.filter((p) => 'fileData' in p || 'inlineData' in p).length;
        const stepInput = {
            model: modelName,
            partsCount: parts.length,
            imageParts,
            candidates: products.map((p) => ({ id: p.id, title: p.title, hasImage: !!p.imageUrl })),
        };
        try {
            const selectionModel = this.genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            selectedId: { type: SchemaType.STRING, description: 'ID of the best match, or empty string' },
                        },
                        required: ['selectedId'],
                    },
                },
            });

            const selectionResult = await selectionModel.generateContent(parts);
            const selText = selectionResult.response.text();
            this.logger.log(`[DEBUG] Disambiguation response: ${selText}`);
            const selParsed = JSON.parse(selText) as { selectedId?: string };
            const selectedId =
                selParsed.selectedId && selParsed.selectedId.trim() !== ''
                    ? selParsed.selectedId.trim()
                    : null;
            telemetry.step('disambiguation', llmStart, stepInput, { selectedId: selectedId ?? '' });
            return selectedId;
        } catch (err) {
            this.logger.warn(`Disambiguation LLM failed: ${err.message}`);
            telemetry.step('disambiguation', llmStart, stepInput, undefined, err?.message || String(err));
            return null;
        }
    }
}

export function generateCardNumberCandidates(raw: string): string[] {
    const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '').replace(/^#+/, '');
    if (!cleaned) {return [];}

    const match = cleaned.match(/^([A-Z]+\d{0,2})-?(\d+)$/);
    if (!match) {return [cleaned, `#${cleaned}`];}

    const prefix = match[1];
    const digitsStripped = match[2].replace(/^0+/, '') || '0';
    const widths = new Set<number>([digitsStripped.length, 3, 4]);

    const out = new Set<string>();
    for (const w of widths) {
        const padded = digitsStripped.padStart(w, '0');
        out.add(`${prefix}-${padded}`);
        out.add(`${prefix}${padded}`);
        out.add(`#${prefix}-${padded}`);
        out.add(`#${prefix}${padded}`);
    }
    return Array.from(out);
}

// Words that appear in many One Piece TCG set names and don't help discriminate;
// excluded from set-name token matching so we filter on the meaningful tokens only.
const SET_NAME_STOP_WORDS = new Set([
    'one',
    'piece',
    'the',
    'of',
    'and',
    'a',
    'an',
    'in',
    'on',
    'to',
    'for',
    'his',
    'her',
    'with',
    'tcg',
    'card',
    'cards',
    'game',
    'set',
    'expansion',
    'booster',
    'japanese',
    'english',
]);

export function extractSetNameTokens(setName: string | undefined | null): string[] {
    if (!setName) {return [];}
    const words = setName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
    return words.filter((w) => w.length >= 3 && !SET_NAME_STOP_WORDS.has(w));
}

function inferImageMimeFromUrl(url: string): string {
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.png')) {return 'image/png';}
    if (clean.endsWith('.webp')) {return 'image/webp';}
    if (clean.endsWith('.gif')) {return 'image/gif';}
    return 'image/jpeg';
}
