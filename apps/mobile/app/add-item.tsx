import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import * as api from '@/lib/api';
import Colors from '@/constants/colors';
import {
  ItemStage,
  ItemType,
  InventoryItem,
  CardCondition,
  GradingCompany,
  SaleChannel,
  STAGE_LABELS,
  STAGE_ORDER,
  TYPE_LABELS,
  CONDITION_LABELS,
  CHANNEL_LABELS,
  ProductType,
  SealedIntegrity,
} from '@/constants/types';
import { getOptimizedImageUrl } from '@/lib/image-utils';

const c = Colors.dark;

const GRADING_COMPANIES: GradingCompany[] = ['BGS', 'PSA', 'OTHER'];

export default function AddItemScreen() {
  const insets = useSafeAreaInsets();
  const { addItem } = useApp();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [name, setName] = useState('');
  const [setCode, setSetCode] = useState('');
  const [setName2, setSetName2] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [type, setType] = useState<ItemType>('single_card');
  const [stage, setStage] = useState<ItemStage>('acquired');
  const [condition, setCondition] = useState<CardCondition>('raw');
  const [gradingCompany, setGradingCompany] = useState<GradingCompany | undefined>();
  const [grade, setGrade] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [refPriceChartingProductId, setRefPriceChartingProductId] = useState<string | undefined>();
  const [acquisitionPrice, setAcquisitionPrice] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [listedPrice, setListedPrice] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [soldChannel, setSoldChannel] = useState<SaleChannel | undefined>();
  const [productType, setProductType] = useState<ProductType | undefined>();
  const [integrity, setIntegrity] = useState<SealedIntegrity>('MINT');
  const [language, setLanguage] = useState('');
  const [notes, setNotes] = useState('');
  const [showPricingSuggestions, setShowPricingSuggestions] = useState(false);
  const [pricingSuggestions, setPricingSuggestions] = useState<any[]>([]);

  // Recognition state
  const [isRecognizing, setIsRecognizing] = useState(false);

  const runRecognition = async (uri: string) => {
    setIsRecognizing(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await api.recognizeImage(uri);

      if (result.success && result.data) {
        const d = result.data;
        if (d.cardName) setName(d.cardName);
        if (d.setName) setSetName2(d.setName);
        if (d.setCode) setSetCode(d.setCode);
        if (d.cardNumber) setCardNumber(d.cardNumber);

        // If it's a graded card, set the type and grading info
        if (d.grader) {
          setType('graded_card');
          setCondition('raw'); // Graded is usually not raw choice

          let grader = d.grader.toUpperCase();
          if (grader === 'BECKETT') grader = 'BGS';

          if (GRADING_COMPANIES.includes(grader as any)) {
            setGradingCompany(grader as any);
          } else {
            setGradingCompany('OTHER');
          }

          if (d.gradeValue) setGrade(d.gradeValue.toString());
          if (d.certificationNumber) setCertNumber(d.certificationNumber);
          else if (d.certNumber) setCertNumber(d.certNumber);
        }

        if (d.language) setLanguage(d.language);
        if (d.refPriceChartingProductId) setRefPriceChartingProductId(d.refPriceChartingProductId);
        if (d.marketPrice) setMarketPrice(d.marketPrice.toString());

        // Add subgrades to notes if available
        if (d.subgrades) {
          const sg = d.subgrades;
          const subgradesText = `Subgrades: Centering ${sg.centering || '-'}, Corners ${sg.corners || '-'}, Edges ${sg.edges || '-'}, Surface ${sg.surface || '-'}`;
          setNotes(prev => prev ? `${prev}\n${subgradesText}` : subgradesText);
        }

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error("Recognition failed:", error);
      // Don't show alert, just let user fill manually if it fails
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleImageAction = async () => {
    if (Platform.OS === 'web') {
      await pickImage();
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose a source',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery permissions to pick an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      runRecognition(uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      runRecognition(uri);
    }
  };

  const handleNameChange = async (text: string) => {
    setName(text);
    if (text.length >= 2) {
      try {
        const response = await api.getMarketProducts({
          page: 1,
          limit: 5,
          search: text,
        });
        setPricingSuggestions(response.items);
        setShowPricingSuggestions(response.items.length > 0);
      } catch (error) {
        console.error("Failed to fetch suggestions", error);
      }
    } else {
      setShowPricingSuggestions(false);
    }
  };

  const selectSuggestion = (card: any) => {
    let finalSetCode = card.setCode || '';
    let finalCardNumber = card.number || '';

    // Handle case where card number is prefixed with #
    if (finalCardNumber.startsWith('#')) {
      finalCardNumber = finalCardNumber.substring(1);
    }

    // If setCode is missing, try to extract it from the number (e.g., "OP01-078")
    if (!finalSetCode && finalCardNumber.includes('-')) {
      const parts = finalCardNumber.split('-');
      if (parts.length === 2) {
        finalSetCode = parts[0];
        finalCardNumber = parts[1];
      }
    } else if (finalSetCode && finalCardNumber.startsWith(finalSetCode)) {
      // If number starts with set code, strip it (e.g., setCode="OP01", number="OP01-078")
      const suffix = finalCardNumber.substring(finalSetCode.length);
      if (suffix.startsWith('-')) {
        finalCardNumber = suffix.substring(1);
      } else if (/^\d+$/.test(suffix)) {
        finalCardNumber = suffix;
      }
    }

    setName(card.name);
    setSetCode(finalSetCode);
    setSetName2(card.set || '');
    setRefPriceChartingProductId(card.id);

    const isSealed =
      card.productType?.includes('BOX') ||
      card.productType?.includes('PACK') ||
      card.productType?.includes('DECK') ||
      card.productType?.includes('TIN') ||
      card.productType?.includes('BUNDLE') ||
      card.productType?.includes('CASE') ||
      card.productType === 'SEALED_OTHER' ||
      /BOX|PACK|DECK|TIN|BUNDLE|CASE|ETB|COLLECTION/i.test(card.name);

    if (isSealed) {
      setType('sealed_product');
      setMarketPrice((card.sealedPrice || card.rawPrice || 0).toString());
      setCardNumber('');

      // Map suggestion productType to our ProductType enum
      let pType: ProductType = 'OTHER';
      const suggestType = (card.productType || '').toUpperCase();
      if (suggestType.includes('BOOSTER_BOX')) pType = 'BOOSTER_BOX';
      else if (suggestType.includes('BOOSTER_PACK')) pType = 'BOOSTER_PACK';
      else if (suggestType.includes('STARTER_DECK')) pType = 'STARTER_DECK';
      else if (suggestType.includes('CASE')) pType = 'CASE';
      else if (suggestType.includes('BUNDLE')) pType = 'BUNDLE';
      else if (suggestType.includes('TIN')) pType = 'MINI_TIN';

      setProductType(pType);
    } else {
      setType('single_card');
      setCardNumber(finalCardNumber);
      setMarketPrice((card.rawPrice || 0).toString());
      setProductType(undefined);
    }
    setShowPricingSuggestions(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Please enter an item name');
      }
      return;
    }

    try {
      let finalImageUri = imageUri;

      // If we have a local image, upload it first
      if (imageUri && !imageUri.startsWith('http')) {
        const { url } = await api.uploadMedia(imageUri);
        finalImageUri = url;
      }

      const newItem: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        setCode,
        setName: setName2 || name,
        cardNumber,
        imageUri: finalImageUri,
        type,
        stage,
        condition,
        gradingCompany: type === 'graded_card' ? gradingCompany : undefined,
        grade: type === 'graded_card' ? grade : undefined,
        certNumber: type === 'graded_card' ? certNumber : undefined,
        refPriceChartingProductId,
        quantity: 1,
        acquisitionPrice: parseFloat(acquisitionPrice) || 0,
        marketPrice: parseFloat(marketPrice) || 0,
        listedPrice: (stage === 'listed' || stage === 'sold') ? parseFloat(listedPrice) : undefined,
        soldPrice: stage === 'sold' ? parseFloat(soldPrice) : undefined,
        soldChannel: stage === 'sold' ? soldChannel : undefined,
        soldDate: stage === 'sold' ? new Date().toISOString() : undefined,
        productType: type === 'sealed_product' ? (productType || 'OTHER') : undefined,
        integrity: type === 'sealed_product' ? integrity : undefined,
        language: type === 'sealed_product' ? language : undefined,
        notes,
      };

      await addItem(newItem as any);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (e) {
      console.error('Failed to save item:', e);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Modal transparent visible={isRecognizing} animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.recognitionContent}>
            <ActivityIndicator size="large" color={c.accent} />
            <Text style={styles.recognitionText}>Recognizing Card...</Text>
            <Text style={styles.recognitionSubtext}>Extracting details with AI</Text>
            <Pressable
              style={styles.skipBtn}
              onPress={() => setIsRecognizing(false)}
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={c.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Item</Text>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.8 : 1 }, !name.trim() && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!name.trim()}
        >
          <Ionicons name="checkmark" size={20} color={c.accentText} />
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={60}
      >
        <Pressable style={styles.imageSection} onPress={handleImageAction}>
          {imageUri ? (
            <Image source={{ uri: getOptimizedImageUrl(imageUri, { height: 600 }) }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={32} color={c.textTertiary} />
              <Text style={styles.imagePlaceholderText}>Add Photo</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Details</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleNameChange}
              placeholder="Search or enter card name..."
              placeholderTextColor={c.textTertiary}
            />
            {showPricingSuggestions && (
              <View style={styles.suggestions}>
                {pricingSuggestions.map((card) => (
                  <Pressable
                    key={card.id}
                    style={styles.suggestionItem}
                    onPress={() => selectSuggestion(card)}
                  >
                    {card.imageUrl ? (
                      <Image source={{ uri: getOptimizedImageUrl(card.imageUrl, { height: 100 }) }} style={styles.suggestionImage} contentFit="cover" />
                    ) : (
                      <View style={styles.suggestionImagePlaceholder}>
                        <Ionicons name="image-outline" size={14} color={c.textTertiary} />
                      </View>
                    )}
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName} numberOfLines={1}>{card.name}</Text>
                      <Text style={styles.suggestionMeta}>{card.set} {card.number ? `#${card.number}` : ''}</Text>
                    </View>
                    <Text style={styles.suggestionPrice}>
                      ${((card.sealedPrice || card.rawPrice) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Set Code</Text>
              <TextInput
                style={styles.input}
                value={setCode}
                onChangeText={setSetCode}
                placeholder="OP05"
                placeholderTextColor={c.textTertiary}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Card Number</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="119"
                placeholderTextColor={c.textTertiary}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type</Text>
          <View style={styles.chipGrid}>
            {(['single_card', 'sealed_product', 'graded_card'] as ItemType[]).map((t) => (
              <Pressable
                key={t}
                style={[styles.chip, type === t && styles.chipActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                  {TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stage</Text>
          <View style={styles.chipGrid}>
            {STAGE_ORDER.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, stage === s && styles.chipActive]}
                onPress={() => setStage(s)}
              >
                <Text style={[styles.chipText, stage === s && styles.chipTextActive]}>
                  {STAGE_LABELS[s]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condition</Text>
          <View style={styles.chipGrid}>
            {(['raw', 'near_mint', 'lightly_played', 'moderately_played', 'heavily_played', 'damaged'] as CardCondition[]).map((cond) => (
              <Pressable
                key={cond}
                style={[styles.chip, condition === cond && styles.chipActive]}
                onPress={() => setCondition(cond)}
              >
                <Text style={[styles.chipText, condition === cond && styles.chipTextActive]}>
                  {CONDITION_LABELS[cond]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {type === 'sealed_product' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sealed Product Details</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Product Type</Text>
              <View style={styles.chipGrid}>
                {(['BOOSTER_BOX', 'BOOSTER_PACK', 'STARTER_DECK', 'CASE', 'BUNDLE', 'OTHER'] as ProductType[]).map((pt) => (
                  <Pressable
                    key={pt}
                    style={[styles.chip, productType === pt && styles.chipActive]}
                    onPress={() => setProductType(pt)}
                  >
                    <Text style={[styles.chipText, productType === pt && styles.chipTextActive]}>
                      {pt.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Integrity</Text>
              <View style={styles.chipGrid}>
                {(['MINT', 'MINOR_DENTS', 'DAMAGED', 'OPENED'] as SealedIntegrity[]).map((int) => (
                  <Pressable
                    key={int}
                    style={[styles.chip, integrity === int && styles.chipActive]}
                    onPress={() => setIntegrity(int)}
                  >
                    <Text style={[styles.chipText, integrity === int && styles.chipTextActive]}>
                      {int}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Language</Text>
              <TextInput
                style={styles.input}
                value={language}
                onChangeText={setLanguage}
                placeholder="e.g. Japanese, English"
                placeholderTextColor={c.textTertiary}
              />
            </View>
          </View>
        )}

        {type === 'graded_card' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grading Details</Text>
            <View style={styles.chipGrid}>
              {GRADING_COMPANIES.map((gc) => (
                <Pressable
                  key={gc}
                  style={[styles.chip, gradingCompany === gc && styles.chipActive]}
                  onPress={() => setGradingCompany(gc)}
                >
                  <Text style={[styles.chipText, gradingCompany === gc && styles.chipTextActive]}>
                    {gc}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Grade</Text>
              <TextInput
                style={styles.input}
                value={grade}
                onChangeText={setGrade}
                placeholder="e.g. 10, 9.5"
                placeholderTextColor={c.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Cert Number</Text>
              <TextInput
                style={styles.input}
                value={certNumber}
                onChangeText={setCertNumber}
                placeholder="Certification number"
                placeholderTextColor={c.textTertiary}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Acquisition Cost</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={acquisitionPrice}
                  onChangeText={setAcquisitionPrice}
                  placeholder="0.00"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Market Price</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={marketPrice}
                  onChangeText={setMarketPrice}
                  placeholder="0.00"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
          {(stage === 'listed' || stage === 'sold') && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Listed Price</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={listedPrice}
                  onChangeText={setListedPrice}
                  placeholder="0.00"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}
        </View>

        {stage === 'sold' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sale Details</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sold Price</Text>
              <View style={styles.priceInputRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={soldPrice}
                  onChangeText={setSoldPrice}
                  placeholder="0.00"
                  placeholderTextColor={c.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Channel</Text>
            <View style={styles.chipGrid}>
              {(['ebay', 'tcgplayer', 'mercari', 'facebook', 'instagram', 'discord', 'in_person', 'other'] as SaleChannel[]).map((ch) => (
                <Pressable
                  key={ch}
                  style={[styles.chip, soldChannel === ch && styles.chipActive]}
                  onPress={() => setSoldChannel(ch)}
                >
                  <Text style={[styles.chipText, soldChannel === ch && styles.chipTextActive]}>
                    {CHANNEL_LABELS[ch]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes..."
            placeholderTextColor={c.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: c.text,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
    gap: 16,
  },
  imageSection: {
    alignItems: 'center',
  },
  image: {
    width: 160,
    height: 220,
    borderRadius: 12,
    backgroundColor: c.surfaceHighlight,
  },
  imagePlaceholder: {
    width: 160,
    height: 220,
    borderRadius: 12,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: c.textTertiary,
    fontWeight: '500' as const,
    textTransform: 'none' as any,
  },
  section: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderLight,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: c.text,
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: c.textTertiary,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: c.surfaceHighlight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    borderWidth: 1,
    borderColor: c.border,
    letterSpacing: 0,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
    letterSpacing: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: c.surfaceHighlight,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.accentDim,
    borderColor: c.accent,
  },
  chipText: {
    fontSize: 13,
    color: c.textSecondary,
    fontWeight: '500' as const,
  },
  chipTextActive: {
    color: c.accent,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dollarSign: {
    fontSize: 16,
    color: c.textSecondary,
    fontWeight: '600' as const,
  },
  suggestions: {
    backgroundColor: c.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: c.text,
  },
  suggestionMeta: {
    fontSize: 12,
    color: c.textTertiary,
    marginTop: 2,
  },
  suggestionPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: c.accent,
  },
  suggestionImage: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: c.surfaceHighlight,
    marginRight: 10,
  },
  suggestionImagePlaceholder: {
    width: 32,
    height: 44,
    borderRadius: 4,
    backgroundColor: c.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  recognitionContent: {
    width: '80%',
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: c.border,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recognitionText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: c.text,
  },
  recognitionSubtext: {
    fontSize: 14,
    color: c.textTertiary,
  },
  skipBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  skipBtnText: {
    color: c.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
