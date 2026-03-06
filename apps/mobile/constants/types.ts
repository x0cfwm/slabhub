export type ItemStage = 'acquired' | 'in_transit' | 'grading' | 'in_stock' | 'listed' | 'sold';

export type ItemType = 'single_card' | 'sealed_product' | 'graded_card';

export type CardCondition = 'raw' | 'near_mint' | 'lightly_played' | 'moderately_played' | 'heavily_played' | 'damaged';

export type GradingCompany = 'PSA' | 'BGS' | 'OTHER';

export type SaleChannel = 'ebay' | 'tcgplayer' | 'mercari' | 'facebook' | 'instagram' | 'discord' | 'in_person' | 'other';

export type ProductType =
  | 'BOOSTER_BOX'
  | 'BOOSTER_PACK'
  | 'STARTER_DECK'
  | 'ILLUSTRATION_BOX'
  | 'MINI_TIN'
  | 'PREMIUM_BOX'
  | 'GIFT_BOX'
  | 'ANNIVERSARY_SET'
  | 'PROMO_PACK'
  | 'TOURNAMENT_KIT'
  | 'CASE'
  | 'BUNDLE'
  | 'OTHER';

export type SealedIntegrity = 'MINT' | 'MINOR_DENTS' | 'DAMAGED' | 'OPENED';

export type FulfillmentOption = 'shipping' | 'meetups_local' | 'meetups_travel';

export type PaymentMethod = 'paypal_gs' | 'venmo' | 'zelle' | 'cashapp' | 'cash' | 'crypto' | 'other';

export interface InventoryItem {
  id: string;
  name: string;
  setCode: string;
  setName: string;
  cardNumber: string;
  imageUri: string;
  type: ItemType;
  stage: ItemStage;
  condition: CardCondition;
  gradingCompany?: GradingCompany;
  grade?: string;
  quantity: number;
  acquisitionPrice: number;
  marketPrice: number;
  marketPriceSnapshot?: number;
  listedPrice?: number;
  soldPrice?: number;
  soldChannel?: SaleChannel;
  soldDate?: string;
  notes: string;
  refPriceChartingProductId?: string;
  productType?: ProductType;
  integrity?: SealedIntegrity;
  language?: string;
  edition?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  username: string;
  handle: string;
  location: string;
  paymentMethods: PaymentMethod[];
  fulfillmentOptions: FulfillmentOption[];
  tradeshows: { name: string; date?: string; link: string }[];
  wishlist: string;
  references: { name: string; link: string }[];
  socials?: {
    instagram?: string;
    tiktok?: string;
    discord?: string;
    tcgplayer?: string;
    ebay?: string;
  };
}

export interface PricingCard {
  id: string;
  name: string;
  setCode: string;
  setName: string;
  cardNumber: string;
  type: ItemType;
  rarity: string;
  marketPrice: number;
  lastSoldEbay?: number;
  lastSoldTcgplayer?: number;
  lastSoldDate?: string;
  imageUri: string;
}

export const STAGE_LABELS: Record<ItemStage, string> = {
  acquired: 'Acquired',
  in_transit: 'In Transit',
  grading: 'Grading',
  in_stock: 'In Stock',
  listed: 'Listed',
  sold: 'Sold',
};

export const STAGE_ORDER: ItemStage[] = ['acquired', 'in_transit', 'grading', 'in_stock', 'listed', 'sold'];

export const CONDITION_LABELS: Record<CardCondition, string> = {
  raw: 'Raw',
  near_mint: 'Near Mint',
  lightly_played: 'Lightly Played',
  moderately_played: 'Moderately Played',
  heavily_played: 'Heavily Played',
  damaged: 'Damaged',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  paypal_gs: 'PayPal G&S',
  venmo: 'Venmo',
  zelle: 'Zelle',
  cashapp: 'CashApp',
  cash: 'Cash',
  crypto: 'Crypto',
  other: 'Other',
};

export const FULFILLMENT_LABELS: Record<FulfillmentOption, string> = {
  shipping: 'Shipping',
  meetups_local: 'Local Meetups',
  meetups_travel: 'Travel Meetups',
};

export const CHANNEL_LABELS: Record<SaleChannel, string> = {
  ebay: 'eBay',
  tcgplayer: 'TCGPlayer',
  mercari: 'Mercari',
  facebook: 'Facebook',
  instagram: 'Instagram',
  discord: 'Discord',
  in_person: 'In Person',
  other: 'Other',
};

export const TYPE_LABELS: Record<ItemType, string> = {
  single_card: 'Single Card',
  sealed_product: 'Sealed Product',
  graded_card: 'Graded Card',
};
