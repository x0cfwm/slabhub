import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GradingRecognitionResult } from './types/grading.types';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

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

    async recognizeFromImage(buffer: Buffer, mimeType: string): Promise<GradingRecognitionResult> {
        if (!this.genAI) {
            throw new BadRequestException('Image recognition is not configured (missing GEMINI_API_KEY)');
        }

        // Prioritize "lite" and "latest" models for speed. 
        // gemini-2.0-flash-lite and gemini-flash-lite-latest are typically much faster.
        const modelNames = [
            'gemini-3.1-flash-lite',
        ];

        let lastError: Error | null = null;
        const startTime = Date.now();
        let processingBuffer = buffer;

        try {
            // Optimization: Resize image if it's likely too large.
            // Gemini doesn't need 4K for OCR. 1024px is plenty.
            const image = sharp(buffer);
            const metadata = await image.metadata();

            if (metadata.width && metadata.height && (metadata.width > 1280 || metadata.height > 1280)) {
                this.logger.debug(`Resizing image from ${metadata.width}x${metadata.height} to max 1280px`);
                processingBuffer = await image
                    .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85 }) // Convert to JPEG 85% for optimal size/quality
                    .toBuffer();
                this.logger.debug(`Reduced size from ${buffer.length} to ${processingBuffer.length} bytes`);
            }
        } catch (e) {
            this.logger.warn(`Failed to process/resize image: ${e.message}. Using original.`);
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
                                        setName: { type: SchemaType.STRING, description: 'Name of the set or expansion' },
                                        setCode: { type: SchemaType.STRING, description: 'Set identifier (e.g., OP05, EB01)' },
                                        cardNumber: { type: SchemaType.STRING, description: 'Numeric card number only (e.g., 119). Exclude set code or variant prefixes.' },
                                        language: { type: SchemaType.STRING, description: 'Language of the card' },
                                        year: { type: SchemaType.STRING, description: 'Year of release' },
                                    },
                                    required: ['grader', 'certNumber', 'gradeValue', 'cardName', 'setName'],
                                },
                            },
                        },
                    },
                });

                const prompt = `
                    You are an expert in trading cards specializing in One Piece and Pockemon.
                    Extract card and grading information from this image. 
                    Focus on the grading label (usually at the top) and the card itself.
                    The grader might be PSA, BGS or OTHER.

                    IMPORTANT PARSING RULES:

                    1. setCode
                    Extract the set identifier used in One Piece TCG.
                    Examples:
                    OP01
                    OP02
                    OP05
                    EB01
                    ST01

                    If the card code appears as "OP05-119", "OP05 119", or "OP05-0119":
                    setCode = "OP05"

                    2. cardNumber
                    Extract ONLY the numeric portion of the card number.

                    Rules:
                    - Remove the set code (OP05, OP09, etc.)
                    - Remove prefixes like SP, AA, SEC
                    - Remove leading zeros
                    - Return only the integer portion

                    Examples:
                    OP05-119 → cardNumber = "119"
                    OP09-0118 → cardNumber = "118"
                    OP09-09118 → cardNumber = "118"
                    SP OP05-119 → cardNumber = "119"

                    3. cardName
                    Return the full card name exactly as printed.

                    5. certificationNumber
                    Extract the slab certification / cert number from the grading label only.
                    Do not infer it from the card.
                    Do not confuse it with the card number.

                    Examples:
                    - BGS label "... 0018431564" -> certificationNumber = "0018431564"
                    - PSA label "... Cert 12345678" -> certificationNumber = "12345678"

                    Return the result in the specified JSON format.
                `;

                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: processingBuffer === buffer ? mimeType : 'image/jpeg',
                        },

                    },
                ]);

                const responseText = result.response.text();
                this.logger.log(`[DEBUG] Gemini response: ${responseText}`);

                const parsed = JSON.parse(responseText) as GradingRecognitionResult;

                // Lookup PriceCharting ID if possible
                if (parsed.success && parsed.data) {
                    const { setCode, cardNumber } = parsed.data;
                    if (setCode && cardNumber) {
                        try {
                            // 1. Find the set by its code
                            const set = await this.prisma.refPriceChartingSet.findFirst({
                                where: {
                                    code: { contains: setCode, mode: 'insensitive' }
                                }
                            });

                            if (set) {
                                // 2. Find the product in that set by card number
                                const matchedProduct = await this.prisma.refPriceChartingProduct.findFirst({
                                    where: {
                                        setId: set.id,
                                        cardNumber: { contains: cardNumber, mode: 'insensitive' }
                                    }
                                });

                                if (matchedProduct) {
                                    this.logger.debug(`Matched product: ${matchedProduct.title} (${matchedProduct.id})`);
                                    parsed.data.refPriceChartingProductId = matchedProduct.id;
                                    if (matchedProduct.rawPrice) {
                                        parsed.data.marketPrice = Number(matchedProduct.rawPrice);
                                    }
                                } else {
                                    this.logger.debug(`No PriceCharting product found in set ${set.name} for cardNumber=${cardNumber}`);
                                }
                            } else {
                                this.logger.debug(`No PriceCharting set found with code=${setCode}`);
                            }
                        } catch (lookupError) {
                            this.logger.warn(`PriceCharting lookup failed: ${lookupError.message}`);
                        }
                    }
                }

                return {
                    ...parsed,
                    durationMs: Date.now() - startTime,
                };
            } catch (error) {
                this.logger.warn(`Model ${modelName} failed: ${error.message}`);
                lastError = error;
                if (error.message.includes('429')) {
                    break;
                }
                continue;
            }
        }

        return {
            success: false,
            error: lastError?.message || 'Recognition failed with all attempted models',
            durationMs: Date.now() - startTime,
        };
    }
}
