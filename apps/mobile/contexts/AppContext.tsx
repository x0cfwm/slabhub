import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  InventoryItem,
  UserProfile,
  ItemStage,
  ItemType,
  CardCondition,
  GradingCompany,
  FulfillmentOption,
} from '@/constants/types';
import * as api from '@/lib/api';
import { InventoryItem as ApiInventoryItem } from '@/lib/types';

import { AppState, AppStateStatus } from 'react-native';

const PROFILE_KEY = '@slabhub_profile';

const DEFAULT_PROFILE: UserProfile = {
  username: '',
  handle: '',
  location: '',
  paymentMethods: [],
  fulfillmentOptions: [],
  tradeshows: [],
  wishlist: '',
  references: [],
};

// Helper to map API items to UI items
const mapApiToUiItem = (item: ApiInventoryItem): InventoryItem => {
  const stageMap: Record<string, ItemStage> = {
    'ACQUIRED': 'acquired',
    'IN_TRANSIT': 'in_transit',
    'BEING_GRADED': 'grading',
    'AUTHENTICATED': 'in_stock', // Map to in_stock for now
    'IN_STOCK': 'in_stock',
    'LISTED': 'listed',
    'SOLD': 'sold',
    'ARCHIVED': 'acquired', // Fallback
  };

  const typeMap: Record<string, ItemType> = {
    'SINGLE_CARD_RAW': 'single_card',
    'SINGLE_CARD_GRADED': 'graded_card',
    'SEALED_PRODUCT': 'sealed_product',
  };

  const conditionMap: Record<string, CardCondition> = {
    'RAW': 'raw',
    'NM': 'near_mint',
    'LP': 'lightly_played',
    'MP': 'moderately_played',
    'HP': 'heavily_played',
    'DMG': 'damaged',
  };

  return {
    id: item.id,
    name: item.cardProfile?.name || item.productName || 'Unknown Item',
    setCode: item.cardProfile?.set || item.setName || '',
    setName: item.cardProfile?.set || item.setName || '',
    cardNumber: item.cardProfile?.cardNumber || '',
    imageUri: (item.photos && item.photos.length > 0) ? item.photos[0] : (item.cardProfile?.imageUrl || ''),
    type: typeMap[item.type] || 'single_card',
    stage: stageMap[item.stage] || 'acquired',
    condition: conditionMap[(item as any).condition || ''] || 'raw',
    gradingCompany: (item as any).gradingCompany as GradingCompany,
    grade: (item as any).grade?.toString(),
    quantity: item.quantity || 1,
    acquisitionPrice: Number(item.acquisitionPrice) || 0,
    marketPrice: Number(item.marketPrice) || 0,
    listedPrice: item.listingPrice ? Number(item.listingPrice) : undefined,
    soldPrice: item.stage === 'SOLD' && item.listingPrice ? Number(item.listingPrice) : undefined,
    notes: item.notes || '',
    createdAt: item.createdAt,
    updatedAt: item.createdAt, // Fallback
  };
};

// Helper to map UI item to API DTO
const mapUiToApiDto = (item: any) => {
  const stageMap: Record<ItemStage, string> = {
    'acquired': 'ACQUIRED',
    'in_transit': 'IN_TRANSIT',
    'grading': 'BEING_GRADED',
    'in_stock': 'IN_STOCK',
    'listed': 'LISTED',
    'sold': 'SOLD',
  };

  const typeMap: Record<ItemType, string> = {
    'single_card': 'SINGLE_CARD_RAW',
    'graded_card': 'SINGLE_CARD_GRADED',
    'sealed_product': 'SEALED_PRODUCT',
  };

  const conditionMap: Record<string, string | undefined> = {
    'raw': undefined,
    'near_mint': 'NM',
    'lightly_played': 'LP',
    'moderately_played': 'MP',
    'heavily_played': 'HP',
    'damaged': 'DMG',
    // Shorthands as fallbacks
    'NM': 'NM',
    'LP': 'LP',
    'MP': 'MP',
    'HP': 'HP',
    'DMG': 'DMG',
  };

  return {
    itemType: typeMap[item.type as ItemType],
    stage: stageMap[item.stage as ItemStage],
    condition: conditionMap[item.condition as CardCondition],
    productName: item.name,
    setName: item.setName,
    gradeProvider: (item as any).gradingCompany,
    gradeValue: (item as any).grade,
    quantity: item.quantity || 1,
    acquisitionPrice: item.acquisitionPrice,
    listingPrice: item.stage === 'sold' ? item.soldPrice : item.listedPrice,
    notes: item.notes,
    photos: item.imageUri ? [item.imageUri] : [],
    // Add more fields as needed based on the DTO
  };
};

interface AppContextValue {
  inventory: InventoryItem[];
  profile: UserProfile;
  isLoading: boolean;
  addItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  moveItem: (id: string, stage: ItemStage) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  getItemsByStage: (stage: ItemStage) => InventoryItem[];
  getTotalMarketValue: () => number;
  getForSaleCount: () => number;
  getSoldItems: () => InventoryItem[];
  refreshInventory: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshInventory();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const loadData = async () => {
    try {
      const profileData = await AsyncStorage.getItem(PROFILE_KEY);
      if (profileData) setProfile(JSON.parse(profileData));

      await Promise.all([
        refreshInventory(),
        refreshProfile()
      ]);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (data?.profile) {
        const p = data.profile;
        const updatedProfile: UserProfile = {
          username: p.shopName,
          handle: p.handle,
          location: p.location || '',
          paymentMethods: (p.paymentsAccepted || []).map((m: any) => {
            const map: any = {
              'Paypal G&S': 'paypal_gs',
              'Venmo': 'venmo',
              'Zelle': 'zelle',
              'Cashapp': 'cashapp',
              'Cash': 'cash',
              'Crypto': 'crypto',
              'Other': 'other'
            };
            return map[m] || m;
          }),
          fulfillmentOptions: (p.fulfillmentOptions || []) as FulfillmentOption[],
          wishlist: p.wishlistText || '',
          tradeshows: (p.upcomingEvents as any[])?.map(e => ({ name: e.name, date: e.date || '', link: e.location || '' })) || [],
          references: (p.referenceLinks as any[])?.map(l => ({ name: l.title, link: l.url || '' })) || [],
          socials: p.socials,
        };
        setProfile(updatedProfile);
        await saveProfile(updatedProfile);
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  }, []);

  const refreshInventory = useCallback(async () => {
    try {
      const apiItems = await api.listInventory();
      setInventory(apiItems.map(mapApiToUiItem));
    } catch (e) {
      console.error('Failed to refresh inventory:', e);
    }
  }, []);

  const saveProfile = async (p: UserProfile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  const addItem = useCallback(async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const dto = mapUiToApiDto(item);
      const newItem = await api.createInventoryItem(dto);
      setInventory(prev => [...prev, mapApiToUiItem(newItem)]);
    } catch (e) {
      console.error('Failed to add item:', e);
      throw e;
    }
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      // Find current item to merge updates for DTO mapping
      const current = inventory.find(i => i.id === id);
      if (!current) return;

      const merged = { ...current, ...updates };
      const dto = mapUiToApiDto(merged);
      const updatedItem = await api.updateInventoryItem(id, dto);

      setInventory(prev => prev.map((item) =>
        item.id === id ? mapApiToUiItem(updatedItem) : item
      ));
    } catch (e) {
      console.error('Failed to update item:', e);
      throw e;
    }
  }, [inventory]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      await api.deleteInventoryItem(id);
      setInventory(prev => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error('Failed to delete item:', e);
      throw e;
    }
  }, []);

  const moveItem = useCallback(async (id: string, stage: ItemStage) => {
    await updateItem(id, { stage });
  }, [updateItem]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      const updated = { ...profile, ...updates };

      // Sync with API
      // Note: UserProfile on mobile has different names than UpdateProfileDto on API
      // Map relevant fields
      const apiDto: any = {};
      if (updates.username) apiDto.shopName = updates.username;
      if (updates.handle) apiDto.handle = updates.handle;
      if (updates.location) {
        apiDto.location = updates.location;
      }
      if (updates.paymentMethods) apiDto.paymentsAccepted = updates.paymentMethods.map(m => {
        const map: any = {
          'paypal_gs': 'Paypal G&S',
          'venmo': 'Venmo',
          'zelle': 'Zelle',
          'cashapp': 'Cashapp',
          'cash': 'Cash',
          'crypto': 'Crypto',
          'other': 'Other'
        };
        return map[m] || m;
      });
      if (updates.fulfillmentOptions) apiDto.fulfillmentOptions = updates.fulfillmentOptions;
      if (updates.wishlist) apiDto.wishlistText = updates.wishlist;
      if (updates.tradeshows) apiDto.upcomingEvents = updates.tradeshows.map(t => ({ name: t.name, date: t.date, location: t.link }));
      if (updates.references) apiDto.referenceLinks = updates.references.map(r => ({ title: r.name, url: r.link }));
      if (updates.socials) apiDto.socials = updates.socials;

      if (Object.keys(apiDto).length > 0) {
        const response = await api.updateProfile(apiDto);
        // Update local state with the returned profile from API to ensure sync
        if (response?.profile) {
          const p = response.profile;
          const syncedProfile: UserProfile = {
            username: p.shopName,
            handle: p.handle,
            location: p.location || '',
            paymentMethods: (p.paymentsAccepted || []).map((m: any) => {
              const map: any = {
                'Paypal G&S': 'paypal_gs',
                'Venmo': 'venmo',
                'Zelle': 'zelle',
                'Cashapp': 'cashapp',
                'Cash': 'cash',
                'Crypto': 'crypto',
                'Other': 'other'
              };
              return map[m] || m;
            }),
            fulfillmentOptions: (p.fulfillmentOptions || []) as FulfillmentOption[],
            wishlist: p.wishlistText || '',
            tradeshows: (p.upcomingEvents as any[])?.map(e => ({ name: e.name, date: e.date || '', link: e.location || '' })) || [],
            references: (p.referenceLinks as any[])?.map(l => ({ name: l.title, link: l.url || '' })) || [],
            socials: p.socials,
          };
          setProfile(syncedProfile);
          await saveProfile(syncedProfile);
          return;
        }
      }

      setProfile(updated);
      await saveProfile(updated);
    } catch (e) {
      console.error('Failed to update profile:', e);
      throw e;
    }
  }, [profile]);

  const getItemsByStage = useCallback((stage: ItemStage) => {
    return inventory.filter((item) => item.stage === stage);
  }, [inventory]);

  const getTotalMarketValue = useCallback(() => {
    return inventory.reduce((sum, item) => sum + item.marketPrice, 0);
  }, [inventory]);

  const getForSaleCount = useCallback(() => {
    return inventory.filter((item) => item.stage === 'listed').length;
  }, [inventory]);

  const getSoldItems = useCallback(() => {
    return inventory.filter((item) => item.stage === 'sold');
  }, [inventory]);

  const value = useMemo(
    () => ({
      inventory,
      profile,
      isLoading,
      addItem,
      updateItem,
      deleteItem,
      moveItem,
      updateProfile,
      getItemsByStage,
      getTotalMarketValue,
      getForSaleCount,
      getSoldItems,
      refreshInventory,
      refreshProfile,
    }),
    [inventory, profile, isLoading, addItem, updateItem, deleteItem, moveItem, updateProfile, getItemsByStage, getTotalMarketValue, getForSaleCount, getSoldItems, refreshInventory, refreshProfile]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
