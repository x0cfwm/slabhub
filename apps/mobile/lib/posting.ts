import { STAGE_LABELS, type InventoryItem } from '../constants/types';
import type {
  PostingBackground,
  PostingGenerateRequest,
  PostingPlatform,
  PostingRatio,
  PostingSelectionMode,
  PostingTextOptions,
  PostingTone,
  PostingVisualOptions,
  WorkflowStatus,
} from './types';

export type PostingPreset = {
  id: PostingPlatform;
  label: string;
  description: string;
  textOptions: PostingTextOptions;
  visualOptions: PostingVisualOptions;
};

export const POSTING_PLATFORM_PRESETS: Record<PostingPlatform, PostingPreset> = {
  INSTAGRAM: {
    id: 'INSTAGRAM',
    label: 'Instagram',
    description: 'Punchy caption and a tall visual for feed posting.',
    textOptions: {
      platform: 'INSTAGRAM',
      tone: 'HYPE',
      language: 'EN',
      includePrice: true,
      includeGrade: true,
      includeHashtags: true,
      includeCta: true,
    },
    visualOptions: {
      template: 'GRID',
      ratio: '4:5',
      showPriceBadge: true,
      showWatermark: true,
      backgroundStyle: 'SUNSET',
    },
  },
  FACEBOOK: {
    id: 'FACEBOOK',
    label: 'Facebook',
    description: 'Cleaner copy and a square-first marketplace look.',
    textOptions: {
      platform: 'FACEBOOK',
      tone: 'PROFESSIONAL',
      language: 'EN',
      includePrice: true,
      includeGrade: true,
      includeHashtags: false,
      includeCta: true,
    },
    visualOptions: {
      template: 'COLLAGE',
      ratio: '1:1',
      showPriceBadge: true,
      showWatermark: true,
      backgroundStyle: 'LIGHT',
    },
  },
};

export function getPostingStatusItemCount(items: InventoryItem[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item.statusId) continue;
    counts.set(item.statusId, (counts.get(item.statusId) ?? 0) + 1);
  }

  return counts;
}

export function getEligiblePostingStatuses(
  statuses: WorkflowStatus[],
  items: InventoryItem[],
): WorkflowStatus[] {
  const counts = getPostingStatusItemCount(items);

  return statuses.filter((status) => {
    if (!status.isEnabled) return false;
    return (counts.get(status.id) ?? 0) > 0;
  });
}

export function getDefaultPostingStatusIds(
  statuses: WorkflowStatus[],
  items: InventoryItem[],
): string[] {
  const eligible = getEligiblePostingStatuses(statuses, items);
  if (eligible.length === 0) return [];

  const listed = eligible.find((status) => status.systemId === 'LISTED');
  return listed ? [listed.id] : [eligible[0].id];
}

export function getPostingItemSubtitle(item: InventoryItem): string {
  const stageLabel = STAGE_LABELS[item.stage];
  return [item.setCode || item.setName, item.cardNumber, stageLabel].filter(Boolean).join(' • ');
}

export function filterPostingItems(items: InventoryItem[], query: string): InventoryItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;

  return items.filter((item) => {
    const haystack = [
      item.name,
      item.setCode,
      item.setName,
      item.cardNumber,
      getPostingItemSubtitle(item),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function getSelectedPostingItems(args: {
  items: InventoryItem[];
  selectionMode: PostingSelectionMode;
  selectedStatusIds: string[];
  selectedItemIds: string[];
}): InventoryItem[] {
  const { items, selectionMode, selectedStatusIds, selectedItemIds } = args;

  if (selectionMode === 'BY_STATUS') {
    const selectedStatuses = new Set(selectedStatusIds);
    return items.filter((item) => item.statusId && selectedStatuses.has(item.statusId));
  }

  const selectedIds = new Set(selectedItemIds);
  return items.filter((item) => selectedIds.has(item.id));
}

export function buildPostingPayload(args: {
  selectionMode: PostingSelectionMode;
  selectedStatusIds: string[];
  selectedItemIds: string[];
  textOptions: PostingTextOptions;
  visualOptions: PostingVisualOptions;
}): PostingGenerateRequest {
  const payload: PostingGenerateRequest = {
    selectionMode: args.selectionMode,
    textOptions: args.textOptions,
    visualOptions: args.visualOptions,
    generationTarget: 'BOTH',
  };

  if (args.selectionMode === 'BY_STATUS') {
    payload.statusIds = args.selectedStatusIds;
  } else {
    payload.itemIds = args.selectedItemIds;
  }

  return payload;
}

export function getPostingAspectRatio(ratio: PostingRatio): number {
  if (ratio === '1:1') return 1;
  if (ratio === '9:16') return 9 / 16;
  return 4 / 5;
}

export function shouldBlockPostingScreen(args: {
  isRefreshing: boolean;
  inventoryCount: number;
  statusCount: number;
}): boolean {
  const { isRefreshing, inventoryCount, statusCount } = args;
  return isRefreshing && inventoryCount === 0 && statusCount === 0;
}

export function shouldShowPostingRefreshNotice(args: {
  isRefreshing: boolean;
  delayElapsed: boolean;
}): boolean {
  const { isRefreshing, delayElapsed } = args;
  return isRefreshing && delayElapsed;
}

export function decodeSvgDataUrl(dataUrl: string): string {
  if (!dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return dataUrl;

  const payload = dataUrl.slice(commaIndex + 1);
  const isBase64 = dataUrl.slice(0, commaIndex).includes(';base64');

  if (isBase64) {
    return typeof globalThis.atob === 'function' ? globalThis.atob(payload) : payload;
  }

  return decodeURIComponent(payload);
}

export function withPostingTone(options: PostingTextOptions, tone: PostingTone): PostingTextOptions {
  return {
    ...options,
    tone,
  };
}

export function withPostingRatio(
  options: PostingVisualOptions,
  ratio: PostingRatio,
): PostingVisualOptions {
  return {
    ...options,
    ratio,
  };
}

export function withPostingBackground(
  options: PostingVisualOptions,
  backgroundStyle: PostingBackground,
): PostingVisualOptions {
  return {
    ...options,
    backgroundStyle,
  };
}
