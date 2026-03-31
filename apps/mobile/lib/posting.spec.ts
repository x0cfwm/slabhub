import assert from 'node:assert/strict';
import {
  POSTING_PLATFORM_PRESETS,
  buildPostingPayload,
  filterPostingItems,
  getDefaultPostingStatusIds,
  getSelectedPostingItems,
  getPostingAspectRatio,
  shouldBlockPostingScreen,
  shouldShowPostingRefreshNotice,
} from './posting';
import {
  clearPostingReviewSession,
  getPostingReviewSession,
  setPostingReviewSession,
} from './posting-review-session';
import type { WorkflowStatus } from './types';
import type { InventoryItem } from '../constants/types';

const statuses: WorkflowStatus[] = [
  {
    id: 'status-in-stock',
    name: 'In Stock',
    color: '#34C759',
    position: 1,
    isEnabled: true,
    systemId: 'IN_STOCK',
    showOnKanban: true,
  },
  {
    id: 'status-listed',
    name: 'Listed',
    color: '#F5C518',
    position: 2,
    isEnabled: true,
    systemId: 'LISTED',
    showOnKanban: true,
  },
];

const items: InventoryItem[] = [
  {
    id: 'i1',
    name: 'Monkey D. Luffy',
    setCode: 'OP01',
    setName: 'Romance Dawn',
    cardNumber: '001',
    imageUri: 'https://cdn.test/luffy.jpg',
    type: 'single_card',
    stage: 'listed',
    condition: 'near_mint',
    quantity: 1,
    acquisitionPrice: 100,
    marketPrice: 140,
    listedPrice: 150,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    statusId: 'status-listed',
  },
  {
    id: 'i2',
    name: 'Roronoa Zoro',
    setCode: 'OP01',
    setName: 'Romance Dawn',
    cardNumber: '025',
    imageUri: 'https://cdn.test/zoro.jpg',
    type: 'single_card',
    stage: 'in_stock',
    condition: 'near_mint',
    quantity: 1,
    acquisitionPrice: 80,
    marketPrice: 110,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    statusId: 'status-in-stock',
  },
];

function run() {
  assert.deepEqual(getDefaultPostingStatusIds(statuses, items), ['status-listed']);

  assert.deepEqual(
    filterPostingItems(items, 'zoro').map((item) => item.id),
    ['i2'],
  );

  assert.deepEqual(
    getSelectedPostingItems({
      items,
      selectionMode: 'BY_STATUS',
      selectedStatusIds: ['status-listed'],
      selectedItemIds: [],
    }).map((item) => item.id),
    ['i1'],
  );

  assert.deepEqual(
    getSelectedPostingItems({
      items,
      selectionMode: 'MANUAL',
      selectedStatusIds: [],
      selectedItemIds: ['i2'],
    }).map((item) => item.id),
    ['i2'],
  );

  assert.deepEqual(
    buildPostingPayload({
      selectionMode: 'MANUAL',
      selectedStatusIds: [],
      selectedItemIds: ['i1', 'i2'],
      textOptions: POSTING_PLATFORM_PRESETS.INSTAGRAM.textOptions,
      visualOptions: POSTING_PLATFORM_PRESETS.INSTAGRAM.visualOptions,
    }),
    {
      selectionMode: 'MANUAL',
      itemIds: ['i1', 'i2'],
      textOptions: POSTING_PLATFORM_PRESETS.INSTAGRAM.textOptions,
      visualOptions: POSTING_PLATFORM_PRESETS.INSTAGRAM.visualOptions,
      generationTarget: 'BOTH',
    },
  );

  assert.equal(getPostingAspectRatio('4:5'), 4 / 5);
  assert.equal(getPostingAspectRatio('1:1'), 1);
  assert.equal(getPostingAspectRatio('9:16'), 9 / 16);
  assert.equal(shouldBlockPostingScreen({ isRefreshing: true, inventoryCount: 0, statusCount: 0 }), true);
  assert.equal(shouldBlockPostingScreen({ isRefreshing: true, inventoryCount: 2, statusCount: 0 }), false);
  assert.equal(shouldBlockPostingScreen({ isRefreshing: false, inventoryCount: 0, statusCount: 0 }), false);
  assert.equal(shouldShowPostingRefreshNotice({ isRefreshing: true, delayElapsed: false }), false);
  assert.equal(shouldShowPostingRefreshNotice({ isRefreshing: true, delayElapsed: true }), true);
  assert.equal(shouldShowPostingRefreshNotice({ isRefreshing: false, delayElapsed: true }), false);

  const sampleGenerated = {
    id: 'generated-1',
    createdAt: '2026-03-30T00:00:00.000Z',
    generationTarget: 'BOTH' as const,
    itemCount: 1,
    caption: 'Sample caption',
    imageDataUrl: ['data:image/svg+xml,%3Csvg%20/%3E'],
    items: [{
      id: 'i1',
      title: 'Monkey D. Luffy',
      subtitle: 'OP01 • 001 • Listed',
      grade: 'BGS 10',
      condition: 'NM',
      price: 37,
      imageUrl: 'https://cdn.test/luffy.jpg',
      statusName: 'Listed',
    }],
    textOptions: POSTING_PLATFORM_PRESETS.INSTAGRAM.textOptions,
    visualOptions: POSTING_PLATFORM_PRESETS.INSTAGRAM.visualOptions,
  };

  clearPostingReviewSession();
  assert.equal(getPostingReviewSession(), null);
  setPostingReviewSession(sampleGenerated);
  assert.deepEqual(getPostingReviewSession(), sampleGenerated);
  clearPostingReviewSession();
  assert.equal(getPostingReviewSession(), null);

  console.log('posting.spec.ts: ok');
}

run();
