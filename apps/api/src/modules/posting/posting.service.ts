import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
    GeneratePostDto,
    PostingBackground,
    PostingGenerationTarget,
    PostingLanguage,
    PostingSelectionMode,
    PostingTextOptionsDto,
    PostingTone,
    PostingVisualOptionsDto,
} from './dto/generate-post.dto';

type SelectedItem = {
    id: string;
    title: string;
    subtitle: string;
    grade: string | null;
    condition: string | null;
    price: number | null;
    imageUrl: string | null;
    statusName: string | null;
};

type LayoutSlot = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type LayoutFrame = {
    x: number;
    y: number;
    width: number;
    height: number;
};

@Injectable()
export class PostingService {
    private readonly logger = new Logger(PostingService.name);

    constructor(

        private readonly prisma: PrismaService,
        private readonly inventoryService: InventoryService,
    ) { }

    async generatePost(userId: string, dto: GeneratePostDto) {
        const generationTarget = dto.generationTarget ?? PostingGenerationTarget.BOTH;
        const selectedItems = await this.resolveSelectedItems(userId, dto);

        const chunkedItems: SelectedItem[][] = [];
        for (let i = 0; i < selectedItems.length; i += 12) {
            chunkedItems.push(selectedItems.slice(i, i + 12));
        }

        const caption = this.buildCaption(dto.textOptions, selectedItems);

        const imageDataUrls: string[] = [];
        if (generationTarget !== PostingGenerationTarget.TEXT_ONLY) {
            const imagePromises = chunkedItems.map((chunk) => this.buildImageDataUrl(dto.visualOptions, chunk));
            const generatedImages = await Promise.all(imagePromises);
            imageDataUrls.push(...generatedImages);
        }

        return {
            id: `temp-${Date.now()}`,
            createdAt: new Date(),
            generationTarget,
            itemCount: selectedItems.length,
            caption,
            imageDataUrl: imageDataUrls,
            items: selectedItems,
            textOptions: dto.textOptions,
            visualOptions: dto.visualOptions,
        };
    }

    private async resolveSelectedItems(userId: string, dto: GeneratePostDto): Promise<SelectedItem[]> {
        const allItems = await this.inventoryService.listItems(userId);

        let selected: any[] = [];
        if (dto.selectionMode === PostingSelectionMode.BY_STATUS) {
            const statusIds = dto.statusIds ?? [];
            if (statusIds.length === 0) {
                throw new BadRequestException('statusIds is required when selectionMode is BY_STATUS');
            }
            selected = allItems.filter((item) => item.statusId && statusIds.includes(item.statusId));
        }

        if (dto.selectionMode === PostingSelectionMode.MANUAL) {
            const itemIds = dto.itemIds ?? [];
            if (itemIds.length === 0) {
                throw new BadRequestException('itemIds is required when selectionMode is MANUAL');
            }
            const idSet = new Set(itemIds);
            selected = allItems.filter((item) => idSet.has(item.id));
        }

        if (selected.length === 0) {
            throw new BadRequestException('No inventory items found for the current selection');
        }

        return selected.slice(0, 48).map((item) => {
            const provider = item.gradeProvider || item.gradingCompany || null;
            const rawGrade = (item.gradeValue || item.grade || null) as string | null;
            const fullGrade = provider && rawGrade ? `${provider} ${rawGrade}` : rawGrade;

            let title = item.productName || item.cardProfile?.name || 'Untitled item';
            // Clean up: removes set names and card numbers from titles (e.g. "Name OP01-001 Set Name")
            const cardNumMatch = title.search(/\s[A-Z0-9]+-\d{3,}/i);
            if (cardNumMatch !== -1) {
                title = title.substring(0, cardNumMatch).trim();
            }

            return {
                id: item.id,
                title,
                subtitle: this.buildSubtitle(item),
                grade: fullGrade,
                condition: (item.condition || null) as string | null,
                price: this.resolvePrice(item),
                imageUrl: this.resolveImageUrl(item),
                statusName: item.status?.name ?? null,
            };
        });
    }

    private buildSubtitle(item: any): string {
        const setCode = item.cardProfile?.setCode || item.setName || '';
        const cardNumber = item.cardProfile?.cardNumber || item.cardNumber || '';
        const stage = item.status?.name || item.stage || '';
        return [setCode, cardNumber, stage].filter(Boolean).join(' • ');
    }

    private resolvePrice(item: any): number | null {
        const value = item.listingPrice ?? item.marketPriceSnapshot ?? item.marketPrice ?? null;
        if (value === null || value === undefined) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private resolveImageUrl(item: any): string | null {
        const slabFront = item.slabImages?.front || item.slabImages?.frontUrl || null;
        return item.frontMediaUrl || slabFront || (item.photos && item.photos.length > 0 ? item.photos[0] : null) || item.cardProfile?.imageUrl || null;
    }


    private buildCaption(options: PostingTextOptionsDto, items: SelectedItem[]): string {
        const normalizedOptions = {
            language: options.language ?? PostingLanguage.EN,
            includePrice: options.includePrice ?? true,
            includeCondition: options.includeCondition ?? true,
            includeGrade: options.includeGrade ?? true,
            includeHashtags: options.includeHashtags ?? true,
            includeCta: options.includeCta ?? true,
            tone: options.tone,
            platform: options.platform,
        };

        const opener = this.getCaptionOpener(normalizedOptions.language, normalizedOptions.tone, items.length);
        const lines = items.map((item, index) => {
            const chunks: string[] = [item.title];

            if (normalizedOptions.includeGrade && item.grade) {
                chunks.push(item.grade);
            }

            if (normalizedOptions.includePrice && item.price !== null) {
                chunks.push(`$${item.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
            }

            return `${this.getEmojiNumber(index + 1)} ${chunks.join(' | ')}`;
        });

        const cta = normalizedOptions.includeCta
            ? (normalizedOptions.language === PostingLanguage.RU
                ? '\nНапишите в ЛС для покупки или резерва.'
                : '\nDM to reserve or buy.')
            : '';

        const hashtags = normalizedOptions.includeHashtags
            ? (normalizedOptions.platform === 'INSTAGRAM'
                ? '\n\n#slabhub #tcg #onepiececardgame #cardsforsale'
                : '\n\n#slabhub #tcg #cardsforsale')
            : '';

        return [opener, ...lines].join('\n') + cta + hashtags;
    }

    private getCaptionOpener(language: PostingLanguage, tone: PostingTone, itemCount: number): string {
        if (language === PostingLanguage.RU) {
            if (tone === PostingTone.HYPE) return `Свежий дроп: ${itemCount} позиций уже готовы.`;
            if (tone === PostingTone.CONCISE) return `В наличии ${itemCount} позиций.`;
            return `Подготовили подборку из ${itemCount} позиций для продажи.`;
        }

        if (tone === PostingTone.HYPE) return `Fresh drop: ${itemCount} items just landed.`;
        if (tone === PostingTone.CONCISE) return `${itemCount} items are available now.`;
        return `Curated sale update with ${itemCount} items.`;
    }

    private async buildImageDataUrl(options: PostingVisualOptionsDto, items: SelectedItem[]): Promise<string> {
        const { width, height } = this.getImageDimensions(options.ratio);
        const background = this.getBackground(options.backgroundStyle ?? PostingBackground.DARK);
        const count = Math.max(1, Math.min(items.length, 12));
        const embeddedImages = await this.buildEmbeddedImageMap(items.slice(0, count));
        const frame = this.getLayoutFrame(options.ratio, width, height);
        const slots = this.getLayoutSlots(count, frame);
        const borderColors = ['#22c55e', '#ef4444', '#a855f7', '#3b82f6', '#eab308'];
        const cards = items.slice(0, count).map((item, index) => {
            const slot = slots[index];
            const x = slot.x;
            const y = slot.y;
            const cardWidth = slot.width;
            const cardHeight = slot.height;
            
            // Layout inspired by premium collectors (gempirecards)
            // full height image with a nice thick colorful border
            const paddingH = 6;
            const paddingV = 6;
            const imageX = x + paddingH;
            const imageY = y + paddingV;
            const imageWidth = cardWidth - paddingH * 2;
            const imageHeight = cardHeight - paddingV * 2;
            
            const borderColor = borderColors[index % borderColors.length];
            const priceText = item.price !== null ? this.formatCompactPrice(item.price) : 'N/A';
            const embeddedImage = item.imageUrl ? (embeddedImages.get(item.imageUrl) ?? null) : null;
            const imageHref = embeddedImage ? this.escapeXml(embeddedImage) : '';
            const imageClipId = `card-img-${index}`;
            const shadowId = `shadow-grad-${index}`;

            const badge = (options.showPriceBadge ?? true) && item.price !== null
                ? `
                    <defs>
                        <linearGradient id="${shadowId}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="black" stop-opacity="0" />
                            <stop offset="100%" stop-color="black" stop-opacity="0.9" />
                        </linearGradient>
                    </defs>
                    <rect x="${imageX}" y="${imageY + imageHeight - Math.round(cardHeight * 0.35)}" width="${imageWidth}" height="${Math.round(cardHeight * 0.35)}" rx="10" fill="url(#${shadowId})" />
                    <text x="${x + cardWidth / 2}" y="${y + cardHeight - 24}" font-family="Arial Black, Arial, sans-serif" font-size="${Math.round(cardWidth / 5.5)}" font-weight="900" text-anchor="middle" fill="#ffffff" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">${this.escapeXml(priceText)}</text>
                `
                : '';


            return `
                <g>
                    <!-- Premium Slot Container with Theme Border -->
                    <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="16" fill="#0b1220" stroke="${borderColor}" stroke-width="6" />
                    
                    <clipPath id="${imageClipId}">
                        <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" rx="10" />
                    </clipPath>
                    
                    <!-- Main Card Image (Full Slot) -->
                    <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" rx="10" fill="#111827" />
                    ${imageHref
                    ? `<image x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" href="${imageHref}" xlink:href="${imageHref}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${imageClipId})" />`
                    : `<text x="${x + cardWidth / 2}" y="${y + cardHeight / 2}" font-family="Arial" font-size="14" text-anchor="middle" fill="#4B5563">No image</text>`}
                    
                    ${badge}
                </g>

            `;
        }).join('\n');


        const watermark = (options.showWatermark ?? true)
            ? `<text x="${frame.x + frame.width - 12}" y="${frame.y + frame.height + 28}" font-family="Arial" font-size="14" text-anchor="end" fill="#ffffff" fill-opacity="0.65">SlabHub</text>`
            : '';

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="${background.start}" />
                    <stop offset="100%" stop-color="${background.end}" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg)" />
            ${cards}
            ${watermark}
        </svg>`;


        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    private async buildEmbeddedImageMap(items: SelectedItem[]): Promise<Map<string, string | null>> {
        const map = new Map<string, string | null>();
        const urls = [...new Set(items.map((item) => item.imageUrl).filter((url): url is string => Boolean(url)))];

        // Keep tests deterministic and offline.
        if (process.env.NODE_ENV === 'test') {
            urls.forEach((url) => map.set(url, null));
            return map;
        }

        // Fetch images in smaller batches to avoid connection pooling limits/throttling
        const BATCH_SIZE = 5; 
        for (let i = 0; i < urls.length; i += BATCH_SIZE) {
            const batch = urls.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(async (originalUrl) => {
                    let dataUrl = await this.fetchImageAsDataUrl(originalUrl);
                    // Single automatic retry for transient network failures
                    if (!dataUrl) {
                        dataUrl = await this.fetchImageAsDataUrl(originalUrl);
                    }
                    map.set(originalUrl, dataUrl);
                }),
            );
        }

        return map;
    }

    private normalizeImageUrl(url: string): string | null {
        if (url.startsWith('data:image/')) return url;
        
        let normalized = url;
        if (url.startsWith('//')) {
            normalized = `https:${url}`;
        } else if (url.startsWith('/')) {
            const apiBase = process.env.NEXT_PUBLIC_API_URL;
            if (apiBase && apiBase.startsWith('http')) {
                normalized = `${apiBase}${url}`;
            } else {
                return null;
            }
        }

        if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
            return null;
        }

        // Speed Optimization: Request pre-resized webp copies from our CDN
        // avoiding downloading 5MB+ originals directly into memory
        const cdnBase = process.env.S3_CDN_BASE_URL || 'https://cdn.slabhub.gg';
        if (normalized.startsWith(cdnBase) && !normalized.includes('/cdn-cgi/image/')) {
            const pathInfo = normalized.substring(cdnBase.length);
            return `${cdnBase}/cdn-cgi/image/width=640,quality=80,format=webp${pathInfo}`;
        }

        return normalized;
    }

    private async fetchImageAsDataUrl(imageUrl: string): Promise<string | null> {
        const normalized = this.normalizeImageUrl(imageUrl);
        if (!normalized) {
            this.logger.warn(`Could not normalize image URL: ${imageUrl}`);
            return null;
        }

        if (normalized.startsWith('data:image/')) return normalized;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout


        try {
            const response = await fetch(normalized, { signal: controller.signal });
            if (!response.ok) {
                this.logger.warn(`Failed to fetch image from ${normalized}: ${response.statusText} (${response.status})`);
                return null;
            }


            const contentType = (response.headers.get('content-type') || '').split(';')[0] || 'image/jpeg';
            if (!contentType.startsWith('image/')) return null;

            const arrayBuffer = await response.arrayBuffer();
            const inputBuffer = Buffer.from(arrayBuffer);

            let outputBuffer = inputBuffer;
            let outputType = contentType;

            // Downscale for predictable payload size in generated SVG preview.
            try {
                outputBuffer = await sharp(inputBuffer)
                    .rotate()
                    .resize(640, 640, { fit: 'cover', withoutEnlargement: true })
                    .jpeg({ quality: 72 })
                    .toBuffer();
                outputType = 'image/jpeg';
            } catch {
                // Keep original bytes if Sharp can't process this format.
            }

            return `data:${outputType};base64,${outputBuffer.toString('base64')}`;
        } catch (error: any) {
            this.logger.error(`Error fetching/processing image from ${normalized}: ${error.message}`);
            return null;
        } finally {

            clearTimeout(timeout);
        }
    }

    private getLayoutFrame(ratio: string, width: number, height: number): LayoutFrame {
        if (ratio === '9:16') {
            // Reels/Stories add heavy top and bottom chrome that users cannot zoom around reliably.
            // Keep the whole collage inside an inner safe area so prices and borders stay visible.
            return {
                x: 54,
                y: 180,
                width: width - 108,
                height: height - 520,
            };
        }

        return {
            x: 0,
            y: 0,
            width,
            height,
        };
    }

    private getLayoutSlots(count: number, frame: LayoutFrame): LayoutSlot[] {
        const padding = frame.height > frame.width ? 40 : 32;
        const gap = frame.height > frame.width ? 24 : 20;

        if (count === 1) {
            return [{
                x: frame.x + padding,
                y: frame.y + padding,
                width: frame.width - padding * 2,
                height: frame.height - padding * 2,
            }];
        }


        if (count === 2) return this.buildRowLayout(frame, [2], padding, gap);
        if (count === 3) return this.buildRowLayout(frame, [1, 2], padding, gap);
        if (count === 4) return this.buildRowLayout(frame, [2, 2], padding, gap);
        if (count === 5) return this.buildRowLayout(frame, [2, 3], padding, gap);
        if (count === 6) return this.buildRowLayout(frame, [3, 3], padding, gap);
        if (count === 7) return this.buildRowLayout(frame, [3, 2, 2], padding, gap);
        if (count === 8) return this.buildRowLayout(frame, [3, 3, 2], padding, gap);
        if (count === 9) return this.buildRowLayout(frame, [3, 3, 3], padding, gap);
        if (count === 10) return this.buildRowLayout(frame, [4, 3, 3], padding, gap);
        if (count === 11) return this.buildRowLayout(frame, [4, 4, 3], padding, gap);
        return this.buildRowLayout(frame, [4, 4, 4], padding, gap);
    }

    private buildRowLayout(
        frame: LayoutFrame,
        rowCounts: number[],
        padding: number,
        gap: number,
    ): LayoutSlot[] {
        const slots: LayoutSlot[] = [];
        const usableHeight = frame.height - padding * 2;
        const rowHeight = (usableHeight - gap * (rowCounts.length - 1)) / rowCounts.length;
        let currentY = frame.y + padding;


        for (const rowCount of rowCounts) {
            const usableRowWidth = frame.width - padding * 2;
            const cardWidth = (usableRowWidth - gap * (rowCount - 1)) / rowCount;
            const rowUsedWidth = cardWidth * rowCount + gap * (rowCount - 1);
            let currentX = frame.x + padding + (usableRowWidth - rowUsedWidth) / 2;

            for (let index = 0; index < rowCount; index++) {
                slots.push({ x: currentX, y: currentY, width: cardWidth, height: rowHeight });
                currentX += cardWidth + gap;
            }

            currentY += rowHeight + gap;
        }

        return slots;
    }

    private getImageDimensions(ratio: string) {
        if (ratio === '1:1') return { width: 1080, height: 1080 };
        if (ratio === '9:16') return { width: 1080, height: 1920 };
        return { width: 1080, height: 1350 };
    }

    private getBackground(style: PostingBackground) {
        if (style === PostingBackground.LIGHT) {
            return { start: '#e2e8f0', end: '#94a3b8' };
        }

        if (style === PostingBackground.SUNSET) {
            return { start: '#7c3aed', end: '#f97316' };
        }

        return { start: '#0b1120', end: '#1f2937' };
    }

    private formatCompactPrice(price: number): string {
        if (price >= 1000) {
            const kValue = price / 1000;
            // No decimal if it's a whole K, otherwise 1 decimal place (e.g. $13.5K)
            const formatted = kValue % 1 === 0 ? kValue.toFixed(0) : kValue.toFixed(1);
            return `$${formatted}K`;
        }
        return `$${Math.round(price)}`;
    }

    private escapeXml(value: string): string {

        return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&apos;');
    }

    private getEmojiNumber(n: number): string {
        const emojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
        if (n === 10) return '🔟';
        return n.toString().split('').map(digit => emojis[parseInt(digit)]).join('');
    }
}
