import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { GradingRecognitionResult } from './types/grading.types';

@Injectable()
export class GradingRecognitionService {
    private readonly logger = new Logger(GradingRecognitionService.name);
    private readonly genAI: GoogleGenerativeAI | null = null;

    constructor(private readonly configService: ConfigService) {
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

        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            success: { type: SchemaType.BOOLEAN },
                            data: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    grader: { type: SchemaType.STRING, description: 'Grader name (PSA, BGS, Beckett, CGC, SGC, ARS)' },
                                    certNumber: { type: SchemaType.STRING, description: 'Certification number' },
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
                                    cardNumber: { type: SchemaType.STRING, description: 'Card number within the set' },
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
                Extract card and grading information from this image. 
                Focus on the grading label (usually at the top) and the card itself.
                The grader might be Beckett (BGS), PSA, CGC, SGC, or ARS.
                Return the result in the specified JSON format.
            `;

            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: buffer.toString('base64'),
                        mimeType,
                    },
                },
            ]);

            const responseText = result.response.text();
            this.logger.debug(`Gemini response: ${responseText}`);

            return JSON.parse(responseText) as GradingRecognitionResult;
        } catch (error) {
            this.logger.error(`Recognition failed: ${error.message}`, error.stack);
            return {
                success: false,
                error: `Failed to recognize image: ${error.message}`,
            };
        }
    }
}
