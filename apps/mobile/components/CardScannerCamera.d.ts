import React from 'react';

export type ScannerAspect = 'card' | 'slab';

export interface CardScannerCameraProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
  aspect?: ScannerAspect;
}

declare const CardScannerCamera: React.FC<CardScannerCameraProps>;
export default CardScannerCamera;
