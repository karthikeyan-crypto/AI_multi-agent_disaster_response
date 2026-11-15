import { useState, useEffect } from 'react';

export type DeviceTier = 'low' | 'medium' | 'high';

export interface DeviceCapability {
  tier: DeviceTier;
  cores: number;
  memory: number;
  isMobile: boolean;
  supportsWebGL: boolean;
}

function detectTier(): DeviceCapability {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { tier: 'medium', cores: 4, memory: 4, isMobile: false, supportsWebGL: true };
  }

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 768;

  let supportsWebGL = true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) supportsWebGL = false;
  } catch {
    supportsWebGL = false;
  }

  let tier: DeviceTier = 'high';
  if (!supportsWebGL || cores <= 2 || memory <= 2) {
    tier = 'low';
  } else if (cores <= 4 || memory <= 4 || isMobile || isSmallScreen) {
    tier = 'medium';
  }

  return { tier, cores, memory, isMobile, supportsWebGL };
}

let cached: DeviceCapability | null = null;

export function useDeviceCapability(): DeviceCapability {
  const [cap, setCap] = useState<DeviceCapability>(() => cached ?? detectTier());

  useEffect(() => {
    if (!cached) cached = detectTier();
    setCap(cached);
  }, []);

  return cap;
}
