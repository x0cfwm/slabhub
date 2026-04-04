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
            'gemini-2.5-flash-lite',
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
                                        rawCardNumber: { type: SchemaType.STRING, description: 'Full printed card number including set prefix (e.g. OP05-119, EB01-001)' },
                                        language: { type: SchemaType.STRING, description: 'Language of the card (English or Japanese)' },
                                        year: { type: SchemaType.STRING, description: 'Year of release' },
                                    },
                                    required: ['grader', 'certNumber', 'gradeValue', 'cardName', 'setName', 'rawCardNumber', 'language'],
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

                    1. rawCardNumber
                    Extract the FULL exact card number printed on the card exactly as it appears. 
                    Examples: "OP05-119", "OP09-0118", "ST01-001".
                    Do NOT remove the set prefix (like OP05).
                    Return the exact alphanumeric string.

                    2. cardName
                    Return the full card name exactly as printed.

                    3. certificationNumber
                    Extract the slab certification / cert number from the grading label only.
                    Do not infer it from the card.
                    Do not confuse it with the card number.

                    4. language
                    Identify the language of the card. 
                    - For One Piece TCG: check the card text and back (if available). Japanese cards have "ONE PIECE" logo with Japanese text or specific card back.
                    - Common values: "English", "Japanese".

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
                    const { rawCardNumber } = parsed.data;
                    if (rawCardNumber) {
                        try {
                            let matchedProducts = await this.prisma.refPriceChartingProduct.findMany({
                                where: {
                                    cardNumber: { contains: rawCardNumber, mode: 'insensitive' }
                                },
                                include: {
                                    set: true
                                }
                            });

                            // Try to format if no results (e.g. OP09118 -> OP09-118)
                            if (matchedProducts.length === 0 && rawCardNumber.length >= 5 && !rawCardNumber.includes('-')) {
                                const formatted = rawCardNumber.slice(0, 4) + '-' + rawCardNumber.slice(4);
                                this.logger.debug(`No match for ${rawCardNumber}, trying formatted: ${formatted}`);
                                matchedProducts = await this.prisma.refPriceChartingProduct.findMany({
                                    where: {
                                        cardNumber: { contains: formatted, mode: 'insensitive' }
                                    },
                                    include: {
                                        set: true
                                    }
                                });
                            }

                            if (matchedProducts.length > 0) {

                                let selectedProduct = null;

                                if (matchedProducts.length === 1) {
                                    selectedProduct = matchedProducts[0];
                                } else if (matchedProducts.length > 1) {
                                    this.logger.debug(`Found ${matchedProducts.length} candidates for cardNumber=${rawCardNumber}. Using LLM for final selection.`);
                                    try {
                                        const candidatePrompt = `
You previously extracted:
- Card Name: "${parsed.data.cardName || ''}"
- Card Number: "${parsed.data.rawCardNumber || ''}"
- Language: "${parsed.data.language || 'English'}"

We found ${matchedProducts.length} variants of this card. Which of the following products EXACTLY matches the image and language?
Look carefully at the art, border, and text. If the card language is ${parsed.data.language || 'English'}, do NOT select a version that says "Japanese" in the title unless there is no other option.

Candidates:
${matchedProducts.map(p => `- ID: ${p.id} | Title: ${p.title}`).join('\n')}

Return a JSON with a single key "selectedId" containing the ID of the exact best match.
If none seem to fit, return an empty string.
`;
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

                                        const selectionResult = await selectionModel.generateContent([
                                            candidatePrompt,
                                            {
                                                inlineData: {
                                                    data: base64Data,
                                                    mimeType: processingBuffer === buffer ? mimeType : 'image/jpeg',
                                                },
                                            },
                                        ]);

                                        const selText = selectionResult.response.text();
                                        this.logger.log(`[DEBUG] Final selection response: ${selText}`);
                                        const selParsed = JSON.parse(selText);

                                        if (selParsed.selectedId && selParsed.selectedId !== '') {
                                            selectedProduct = matchedProducts.find(p => p.id === selParsed.selectedId) || matchedProducts[0];
                                        } else {
                                            this.logger.debug(`LLM couldn't decide, defaulting to first candidate.`);
                                            selectedProduct = matchedProducts[0];
                                        }
                                    } catch (err) {
                                        this.logger.warn(`Selection LLM failed: ${err.message}`);
                                        selectedProduct = matchedProducts[0];
                                    }
                                }

                                if (selectedProduct) {
                                    this.logger.debug(`Selected product: ${selectedProduct.title} (${selectedProduct.id})`);
                                    parsed.data.refPriceChartingProductId = selectedProduct.id;
                                    parsed.data.productName = selectedProduct.title || undefined;
                                    parsed.data.productSet = (selectedProduct as any).set?.name || undefined;
                                    parsed.data.productNumber = selectedProduct.cardNumber || undefined;
                                    parsed.data.productImageUrl = (selectedProduct.imageUrl as string) || undefined;
                                    if (selectedProduct.rawPrice) {
                                        parsed.data.marketPrice = Number(selectedProduct.rawPrice);
                                    }
                                    if (selectedProduct.grade7Price) parsed.data.grade7Price = Number(selectedProduct.grade7Price);
                                    if (selectedProduct.grade8Price) parsed.data.grade8Price = Number(selectedProduct.grade8Price);
                                    if (selectedProduct.grade9Price) parsed.data.grade9Price = Number(selectedProduct.grade9Price);
                                    if (selectedProduct.grade95Price) parsed.data.grade95Price = Number(selectedProduct.grade95Price);
                                    if (selectedProduct.grade10Price) parsed.data.grade10Price = Number(selectedProduct.grade10Price);
                                    if (selectedProduct.sealedPrice) parsed.data.sealedPrice = Number(selectedProduct.sealedPrice);
                                }
                            } else {
                                this.logger.debug(`No PriceCharting product found for cardNumber like ${rawCardNumber}`);
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
