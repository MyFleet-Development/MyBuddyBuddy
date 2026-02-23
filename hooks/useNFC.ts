import { useCallback, useEffect, useRef, useState } from 'react';
import NfcManager, { NfcEvents, NfcTech } from 'react-native-nfc-manager';
import { useAppState } from '../contexts/AppStateContext';

interface NFCState {
  isSupported: boolean;
  isEnabled: boolean;
  isScanning: boolean;
  error: string | null;
}

interface NFCTag {
  id: string;
  reversedId: string;
  techTypes: string[];
  ndefMessage?: any[];
}

export function useNFC() {
  const { state: appState, setSignInButtonPressed, setScanningStopped, setLastTag, resetNFCFlags } = useAppState();
  
  const [nfcState, setNfcState] = useState<NFCState>({
    isSupported: false,
    isEnabled: false,
    isScanning: false,
    error: null,
  });

  const tagEventRegisteredRef = useRef(false);
  
  // Use refs to track sign-in state that won't be reset by React state changes
  const signInButtonPressedRef = useRef(false);
  const scanningStoppedRef = useRef(false);

  // Function to reverse Mifare Classic ID to match printed format
  const reverseMifareId = (scannedId: string): string => {
    if (!/^[0-9A-Fa-f]+$/.test(scannedId) || scannedId.length % 2 !== 0) {
      return scannedId;
    }
    // For Mifare Classic, reverse the byte pairs
    const bytes = scannedId.match(/.{2}/g) || [];
    return bytes.reverse().join('');
  };


  useEffect(() => {
    console.log('signInButtonPressed', appState.signInButtonPressed);
    console.log('scanningStopped', appState.scanningStopped);
  },[
    appState.signInButtonPressed,
    appState.scanningStopped,
  ]);

  // Initialize NFC
  useEffect(() => {
    const initNFC = async () => {
      try {
        // Check if NfcManager is available (prevents hot reload issues)
        if (!NfcManager || typeof NfcManager.isSupported !== 'function') {
          console.warn('NfcManager not available, skipping initialization');
          return;
        }

        const isSupported = await NfcManager.isSupported();
        const isEnabled = await NfcManager.isEnabled();
        
        setNfcState(prev => ({
          ...prev,
          isSupported,
          isEnabled,
          error: null,
        }));

        if (isSupported && isEnabled) {
          await NfcManager.start();
        }
      } catch (error) {
        setNfcState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown NFC error',
        }));
      }
    };

    initNFC();

    return () => {
      tagEventRegisteredRef.current = false;

      try {
        if (NfcManager && typeof NfcManager.unregisterTagEvent === 'function') {
          NfcManager.unregisterTagEvent();
        }
      } catch (error) {
        console.warn('Error cleaning up NFC on unmount:', error);
      }

      try {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      } catch (error) {
        console.warn('Error removing NFC event listener on unmount:', error);
      }
    };
  }, []);

  const handleTagDiscovered = useCallback(
    async (tag: any) => {
      if (!tagEventRegisteredRef.current) {
        console.log('Tag discovered while scanning inactive - ignoring');
        return;
      }

      if (scanningStoppedRef.current) {
        console.log('Tag discovered but scanning stopped - ignoring');
        return;
      }

      if (!tag) {
        console.log('No tag data received');
        return;
      }

      scanningStoppedRef.current = true;
      tagEventRegisteredRef.current = false;

      console.log('Raw tag data:', tag);
      const scannedIdRaw =
        typeof tag.id === 'string'
          ? tag.id
          : Array.isArray(tag.id)
            ? tag.id.map((b: number) => b.toString(16).padStart(2, '0')).join('')
            : 'unknown';
      const scannedId = scannedIdRaw.toUpperCase();
      const reversedId = reverseMifareId(scannedId);

      const nfcTag: NFCTag = {
        id: scannedId,
        reversedId,
        techTypes: tag.techTypes || [],
        ndefMessage: tag.ndefMessage,
      };

      console.log('NFC Tag detected - Scanned ID:', nfcTag.id);
      console.log('NFC Tag detected - Reversed ID (for matching):', nfcTag.reversedId);

      setNfcState(prev => ({ ...prev, isScanning: false }));
      setLastTag(nfcTag);

      try {
        if (NfcManager && typeof NfcManager.unregisterTagEvent === 'function') {
          await NfcManager.unregisterTagEvent();
        }
      } catch (error) {
        console.warn('Error unregistering NFC tag event:', error);
      }
    },
    [reverseMifareId, setLastTag]
  );

  useEffect(() => {
    try {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, handleTagDiscovered);
    } catch (error) {
      console.warn('Error setting NFC event listener:', error);
    }

    return () => {
      try {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      } catch (error) {
        console.warn('Error removing NFC event listener:', error);
      }
    };
  }, [handleTagDiscovered]);

  // Start continuous NFC scanning
  const startScanning = useCallback(() => {
    if (!nfcState.isSupported || !nfcState.isEnabled) {
      setNfcState(prev => ({ ...prev, error: 'NFC is not supported or enabled on this device' }));
      return;
    }

    if (!NfcManager || typeof NfcManager.registerTagEvent !== 'function') {
      setNfcState(prev => ({ ...prev, error: 'NFC Manager not available' }));
      return;
    }

    setSignInButtonPressed(false);
    setScanningStopped(false);
    signInButtonPressedRef.current = false;
    scanningStoppedRef.current = false;

    if (tagEventRegisteredRef.current) {
      console.log('NFC scanning already active - skipping restart');
      return;
    }

    setNfcState(prev => ({ ...prev, isScanning: true, error: null }));

    const registerListener = async () => {
      try {
        console.log('Registering NFC tag event listener...');
        await NfcManager.registerTagEvent(undefined, 'Hold your device near the card', {
          invalidateAfterFirstRead: true,
        });

        tagEventRegisteredRef.current = true;
        console.log('NFC tag event listener registered');
      } catch (error) {
        tagEventRegisteredRef.current = false;

        const errorMessage = error instanceof Error ? error.message : 'Failed to start NFC scanning';
        if (!signInButtonPressedRef.current && !scanningStoppedRef.current) {
          setNfcState(prev => ({ ...prev, isScanning: false, error: errorMessage }));
        }
        console.error('Failed to register NFC tag event:', error);
      }
    };

    registerListener();
  }, [nfcState.isSupported, nfcState.isEnabled, setLastTag, setScanningStopped, setSignInButtonPressed]);

  // Scan for NFC tags (one-time scan)
  const scanForTag = useCallback(async (): Promise<NFCTag | null> => {
    if (!nfcState.isSupported || !nfcState.isEnabled) {
      throw new Error('NFC is not supported or enabled on this device');
    }

    // Check if NfcManager is available
    if (!NfcManager || typeof NfcManager.requestTechnology !== 'function') {
      throw new Error('NFC Manager not available');
    }

    setNfcState(prev => ({ ...prev, isScanning: true, error: null }));

    try {
      // Try multiple NFC technologies to support more card types
      await NfcManager.requestTechnology([
        NfcTech.Ndef,
        NfcTech.NfcA,
        NfcTech.NfcB,
        NfcTech.NfcF,
        NfcTech.NfcV,
        NfcTech.IsoDep,
        NfcTech.MifareClassic,
        NfcTech.MifareUltralight,
      ]);
      const tag = await NfcManager.getTag();
      
      if (tag) {
        const scannedId = tag.id || 'unknown';
        const reversedId = reverseMifareId(scannedId);
        
        const nfcTag: NFCTag = {
          id: scannedId,
          reversedId: reversedId,
          techTypes: tag.techTypes || [],
          ndefMessage: tag.ndefMessage,
        };
        
        setLastTag(nfcTag);
        return nfcTag;
      }
      
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to read NFC tag';
      setNfcState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setNfcState(prev => ({ ...prev, isScanning: false }));
      // Add null check for cancelTechnologyRequest
      try {
        if (NfcManager && typeof NfcManager.cancelTechnologyRequest === 'function') {
          NfcManager.cancelTechnologyRequest();
        }
      } catch (error) {
        console.warn('Error canceling NFC technology request:', error);
      }
    }
  }, [nfcState.isSupported, nfcState.isEnabled, setLastTag]);

  // Mark sign-in button as pressed
  const markSignInPressed = useCallback(() => {
    console.log('Sign-in button pressed - will ignore NFC errors');
    setSignInButtonPressed(true);
    signInButtonPressedRef.current = true;
  }, [setSignInButtonPressed]);

  // Reset sign-in button flag (call when returning to login screen)
  const resetSignInFlag = useCallback(() => {
    console.log('Resetting sign-in button flag');
    setSignInButtonPressed(false);
    signInButtonPressedRef.current = false;
  }, [setSignInButtonPressed]);

  // Reset all flags when starting fresh scanning
  const resetAllFlags = useCallback(() => {
    console.log('Resetting all NFC flags for fresh start - CALLED FROM:', new Error().stack);
    resetNFCFlags();
    signInButtonPressedRef.current = false;
    scanningStoppedRef.current = false;
  }, [resetNFCFlags]);


  // Stop NFC scanning
  const stopScanning = useCallback(() => {
    console.log('Stopping NFC scanning... [V2.1 - ' + new Date().toISOString() + ']');
    
    setScanningStopped(true);
    scanningStoppedRef.current = true;
    tagEventRegisteredRef.current = false;

    (async () => {
      try {
        if (NfcManager && typeof NfcManager.unregisterTagEvent === 'function') {
          await NfcManager.unregisterTagEvent();
        }
      } catch (unregisterError) {
        console.warn('Error unregistering NFC tag event:', unregisterError);
      }
    })();

    setNfcState(prev => ({ ...prev, isScanning: false }));
    console.log('NFC scanning stopped');
  }, [setScanningStopped]);

  // Check if device supports NFC
  const checkNFCSupport = useCallback(async () => {
    try {
      // Check if NfcManager is available
      if (!NfcManager || typeof NfcManager.isSupported !== 'function') {
        console.warn('NfcManager not available for support check');
        return { isSupported: false, isEnabled: false };
      }

      const isSupported = await NfcManager.isSupported();
      const isEnabled = await NfcManager.isEnabled();
      
      setNfcState(prev => ({
        ...prev,
        isSupported,
        isEnabled,
        error: null,
      }));

      return { isSupported, isEnabled };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check NFC support';
      setNfcState(prev => ({ ...prev, error: errorMessage }));
      return { isSupported: false, isEnabled: false };
    }
  }, []);

  return {
    ...nfcState,
    lastTag: appState.lastTag,
    scanForTag,
    startScanning,
    stopScanning,
    markSignInPressed,
    resetSignInFlag,
    resetAllFlags,
    checkNFCSupport,
  };
}
