import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  InventoryItem,
  UserProfile,
  ItemStage,
  PaymentMethod,
  FulfillmentOption,
} from '@/constants/types';

const INVENTORY_KEY = '@slabhub_inventory';
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inventoryData, profileData] = await Promise.all([
        AsyncStorage.getItem(INVENTORY_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (inventoryData) setInventory(JSON.parse(inventoryData));
      if (profileData) setProfile(JSON.parse(profileData));
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveInventory = async (items: InventoryItem[]) => {
    try {
      await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save inventory:', e);
    }
  };

  const saveProfile = async (p: UserProfile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  const addItem = useCallback(async (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: Crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...inventory, newItem];
    setInventory(updated);
    await saveInventory(updated);
  }, [inventory]);

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    const updated = inventory.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    setInventory(updated);
    await saveInventory(updated);
  }, [inventory]);

  const deleteItem = useCallback(async (id: string) => {
    const updated = inventory.filter((item) => item.id !== id);
    setInventory(updated);
    await saveInventory(updated);
  }, [inventory]);

  const moveItem = useCallback(async (id: string, stage: ItemStage) => {
    await updateItem(id, { stage });
  }, [updateItem]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await saveProfile(updated);
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
    }),
    [inventory, profile, isLoading, addItem, updateItem, deleteItem, moveItem, updateProfile, getItemsByStage, getTotalMarketValue, getForSaleCount, getSoldItems]
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
