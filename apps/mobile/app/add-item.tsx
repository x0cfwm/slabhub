import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
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
  CardCondition,
  GradingCompany,
  SaleChannel,
  STAGE_LABELS,
  STAGE_ORDER,
  TYPE_LABELS,
  CONDITION_LABELS,
  CHANNEL_LABELS,
} from '@/constants/types';


const c = Colors.dark;

const GRADING_COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'SGC', 'ACE', 'other'];

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
  const [acquisitionPrice, setAcquisitionPrice] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [listedPrice, setListedPrice] = useState('');
  const [soldPrice, setSoldPrice] = useState('');
  const [soldChannel, setSoldChannel] = useState<SaleChannel | undefined>();
  const [notes, setNotes] = useState('');
  const [showPricingSuggestions, setShowPricingSuggestions] = useState(false);
  const [pricingSuggestions, setPricingSuggestions] = useState<any[]>([]);

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
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
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
    setName(card.name);
    setSetCode(card.setCode || '');
    setSetName2(card.set || '');

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
    } else {
      setType('single_card');
      setCardNumber(card.number || '');
      setMarketPrice((card.rawPrice || 0).toString());
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

      await addItem({
        name: name.trim(),
        setCode,
        setName: setName2,
        cardNumber: cardNumber,
        imageUri: finalImageUri,
        type,
        stage,
        condition,
        gradingCompany: type === 'graded_card' ? gradingCompany : undefined,
        grade: type === 'graded_card' ? grade : undefined,
        quantity: 1,
        acquisitionPrice: parseFloat(acquisitionPrice) || 0,
        marketPrice: parseFloat(marketPrice) || 0,
        listedPrice: listedPrice ? parseFloat(listedPrice) : undefined,
        soldPrice: soldPrice ? parseFloat(soldPrice) : undefined,
        soldChannel: stage === 'sold' ? soldChannel : undefined,
        soldDate: stage === 'sold' ? new Date().toISOString() : undefined,
        notes,
      });

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
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
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
    padding: 20,
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
});
