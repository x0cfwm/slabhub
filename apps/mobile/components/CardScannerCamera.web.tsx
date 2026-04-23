import { useEffect } from 'react';

export type ScannerAspect = 'card' | 'slab';

interface Props {
  onCapture: (uri: string) => void;
  onClose: () => void;
  aspect?: ScannerAspect;
}

// Web uses the standard file input via ImagePicker — the scanner UI is native-only.
export default function CardScannerCamera({ onClose }: Props) {
  useEffect(() => {
    onClose();
  }, [onClose]);
  return null;
}
