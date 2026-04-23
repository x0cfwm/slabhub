import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, G, Mask, Path, Rect } from 'react-native-svg';
import Colors from '@/constants/colors';

const c = Colors.dark;

// Standard TCG card: 63mm × 88mm (2.5" × 3.5") — aspect ≈ 0.716.
// Slabs (PSA/BGS) are taller, aspect ≈ 0.64. Default to card; caller can override.
const CARD_ASPECT = 63 / 88;
const SLAB_ASPECT = 0.64;

export type ScannerAspect = 'card' | 'slab';

interface Props {
  onCapture: (uri: string) => void;
  onClose: () => void;
  aspect?: ScannerAspect;
}

export default function CardScannerCamera({ onCapture, onClose, aspect = 'card' }: Props) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const insets = useSafeAreaInsets();

  const [torch, setTorch] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [didRequest, setDidRequest] = useState(false);

  const { width: W, height: H } = Dimensions.get('window');

  useEffect(() => {
    if (!hasPermission && !didRequest) {
      setDidRequest(true);
      requestPermission();
    }
  }, [hasPermission, didRequest, requestPermission]);

  const frame = useMemo(() => {
    const targetAspect = aspect === 'slab' ? SLAB_ASPECT : CARD_ASPECT;
    // Prefer width-based sizing, fall back if too tall.
    const widthFirst = W * 0.85;
    const heightFromWidth = widthFirst / targetAspect;
    const maxH = H * 0.62;
    const finalH = Math.min(heightFromWidth, maxH);
    const finalW = finalH * targetAspect;
    return {
      left: (W - finalW) / 2,
      top: (H - finalH) / 2,
      width: finalW,
      height: finalH,
    };
  }, [W, H, aspect]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });

      const photoUri = photo.path.startsWith('file://')
        ? photo.path
        : `file://${photo.path}`;

      // The preview uses "cover" fit, so the photo is cropped symmetrically to
      // fill the screen. Map the on-screen frame to photo pixel coordinates.
      const photoW = photo.width;
      const photoH = photo.height;
      const photoAspect = photoW / photoH;
      const screenAspect = W / H;

      let visibleW: number;
      let visibleH: number;
      let offsetX: number;
      let offsetY: number;

      if (photoAspect > screenAspect) {
        visibleH = photoH;
        visibleW = photoH * screenAspect;
        offsetX = (photoW - visibleW) / 2;
        offsetY = 0;
      } else {
        visibleW = photoW;
        visibleH = photoW / screenAspect;
        offsetX = 0;
        offsetY = (photoH - visibleH) / 2;
      }

      const scaleX = visibleW / W;
      const scaleY = visibleH / H;

      const cropX = Math.max(0, Math.round(offsetX + frame.left * scaleX));
      const cropY = Math.max(0, Math.round(offsetY + frame.top * scaleY));
      const cropW = Math.min(photoW - cropX, Math.round(frame.width * scaleX));
      const cropH = Math.min(photoH - cropY, Math.round(frame.height * scaleY));

      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );

      onCapture(manipulated.uri);
    } catch (e) {
      console.error('Capture failed', e);
      Alert.alert('Capture failed', 'Could not take the photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, frame, W, H, onCapture]);

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={48} color={c.textTertiary} />
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            Allow SlabHub to use the camera so you can scan cards and slabs.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant permission</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onClose} hitSlop={10}>
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permissionTitle}>No camera available</Text>
        <Pressable style={styles.secondaryBtn} onPress={onClose} hitSlop={10}>
          <Text style={styles.secondaryBtnText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const { left, top, width: fW, height: fH } = frame;
  const cornerLen = 26;
  const cornerRadius = 14;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        photo
        torch={torch}
      />

      <Svg style={StyleSheet.absoluteFill} width={W} height={H} pointerEvents="none">
        <Defs>
          <Mask id="cutout">
            <Rect x={0} y={0} width={W} height={H} fill="white" />
            <Rect
              x={left}
              y={top}
              width={fW}
              height={fH}
              rx={cornerRadius}
              ry={cornerRadius}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="rgba(0,0,0,0.55)" mask="url(#cutout)" />
        <G stroke={c.accent} strokeWidth={3} strokeLinecap="round" fill="none">
          <Path
            d={`M ${left} ${top + cornerLen} L ${left} ${top + cornerRadius} Q ${left} ${top} ${left + cornerRadius} ${top} L ${left + cornerLen} ${top}`}
          />
          <Path
            d={`M ${left + fW - cornerLen} ${top} L ${left + fW - cornerRadius} ${top} Q ${left + fW} ${top} ${left + fW} ${top + cornerRadius} L ${left + fW} ${top + cornerLen}`}
          />
          <Path
            d={`M ${left + fW} ${top + fH - cornerLen} L ${left + fW} ${top + fH - cornerRadius} Q ${left + fW} ${top + fH} ${left + fW - cornerRadius} ${top + fH} L ${left + fW - cornerLen} ${top + fH}`}
          />
          <Path
            d={`M ${left + cornerLen} ${top + fH} L ${left + cornerRadius} ${top + fH} Q ${left} ${top + fH} ${left} ${top + fH - cornerRadius} L ${left} ${top + fH - cornerLen}`}
          />
        </G>
      </Svg>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Scan card</Text>
        <Pressable
          onPress={() => setTorch((t) => (t === 'off' ? 'on' : 'off'))}
          style={styles.iconBtn}
          hitSlop={10}
        >
          <Ionicons name={torch === 'on' ? 'flash' : 'flash-off'} size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={[styles.hint, { top: top + fH + 20 }]}>
        <Text style={styles.hintText}>Align the card inside the frame</Text>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={handleCapture}
          disabled={isCapturing}
          style={({ pressed }) => [
            styles.shutterOuter,
            pressed && { transform: [{ scale: 0.94 }] },
            isCapturing && { opacity: 0.7 },
          ]}
        >
          <View style={styles.shutterInner}>
            {isCapturing ? <ActivityIndicator color={c.accentText} /> : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 20,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionWrap: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: c.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  permissionBody: {
    color: c.textTertiary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: c.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  primaryBtnText: {
    color: c.accentText,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryBtnText: {
    color: c.textTertiary,
    fontSize: 14,
  },
});
