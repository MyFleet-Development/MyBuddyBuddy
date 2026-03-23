import { useCallback, useEffect, useRef, useState } from "react";
import NfcManager, { NfcEvents } from "react-native-nfc-manager";
import { useAppState } from "../contexts/AppStateContext";

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

const DEBOUNCE_MS = 2000; // ignore duplicate scans within 2 seconds

export function useNFC() {
  const { setLastTag } = useAppState();

  const [nfcState, setNfcState] = useState<NFCState>({
    isSupported: false,
    isEnabled: false,
    isScanning: false,
    error: null,
  });

  const tagEventRegisteredRef = useRef(false);
  const lastTagTimeRef = useRef<number>(0);

  // Function to reverse Mifare Classic ID to match printed format
  const reverseMifareId = (scannedId: string): string => {
    if (!/^[0-9A-Fa-f]+$/.test(scannedId) || scannedId.length % 2 !== 0) {
      return scannedId;
    }
    const bytes = scannedId.match(/.{2}/g) || [];
    return bytes.reverse().join("");
  };

  // Initialize NFC on mount
  useEffect(() => {
    const initNFC = async () => {
      try {
        if (!NfcManager || typeof NfcManager.isSupported !== "function") {
          console.warn("NfcManager not available, skipping initialization");
          return;
        }

        const isSupported = await NfcManager.isSupported();
        const isEnabled = await NfcManager.isEnabled();

        setNfcState((prev) => ({
          ...prev,
          isSupported,
          isEnabled,
          error: null,
        }));

        if (isSupported && isEnabled) {
          await NfcManager.start();
        }
      } catch (error) {
        setNfcState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Unknown NFC error",
        }));
      }
    };

    initNFC();

    return () => {
      tagEventRegisteredRef.current = false;
      try {
        if (NfcManager && typeof NfcManager.unregisterTagEvent === "function") {
          NfcManager.unregisterTagEvent();
        }
      } catch (error) {
        console.warn("Error cleaning up NFC on unmount:", error);
      }
      try {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      } catch (error) {
        console.warn("Error removing NFC event listener on unmount:", error);
      }
    };
  }, []);

  // Handle tag discovery
  const handleTagDiscovered = useCallback(
    async (tag: any) => {
      if (!tagEventRegisteredRef.current) {
        console.log("Tag discovered while scanning inactive - ignoring");
        return;
      }

      if (!tag) {
        console.log("No tag data received");
        return;
      }

      // Debounce — ignore duplicate tag events within 2 seconds
      const now = Date.now();
      if (now - lastTagTimeRef.current < DEBOUNCE_MS) {
        console.log("Tag event debounced - ignoring duplicate");
        return;
      }
      lastTagTimeRef.current = now;

      tagEventRegisteredRef.current = false;

      console.log("Raw tag data:", tag);
      const scannedIdRaw =
        typeof tag.id === "string"
          ? tag.id
          : Array.isArray(tag.id)
            ? tag.id
                .map((b: number) => b.toString(16).padStart(2, "0"))
                .join("")
            : "unknown";
      const scannedId = scannedIdRaw.toUpperCase();
      const reversedId = reverseMifareId(scannedId);

      const nfcTag: NFCTag = {
        id: scannedId,
        reversedId,
        techTypes: tag.techTypes || [],
        ndefMessage: tag.ndefMessage,
      };

      console.log("NFC Tag detected - Scanned ID:", nfcTag.id);
      console.log("NFC Tag detected - Reversed ID:", nfcTag.reversedId);

      setNfcState((prev) => ({ ...prev, isScanning: false }));
      setLastTag(nfcTag);

      try {
        if (NfcManager && typeof NfcManager.unregisterTagEvent === "function") {
          await NfcManager.unregisterTagEvent();
        }
      } catch (error) {
        console.warn("Error unregistering NFC tag event:", error);
      }
    },
    [setLastTag],
  );

  // Register event listener
  useEffect(() => {
    try {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, handleTagDiscovered);
    } catch (error) {
      console.warn("Error setting NFC event listener:", error);
    }

    return () => {
      try {
        NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      } catch (error) {
        console.warn("Error removing NFC event listener:", error);
      }
    };
  }, [handleTagDiscovered]);

  // Start scanning
  const startScanning = useCallback(() => {
    if (!nfcState.isSupported || !nfcState.isEnabled) {
      setNfcState((prev) => ({
        ...prev,
        error: "NFC is not supported or enabled on this device",
      }));
      return;
    }

    if (!NfcManager || typeof NfcManager.registerTagEvent !== "function") {
      setNfcState((prev) => ({ ...prev, error: "NFC Manager not available" }));
      return;
    }

    if (tagEventRegisteredRef.current) {
      console.log("NFC scanning already active - skipping restart");
      return;
    }

    setNfcState((prev) => ({ ...prev, isScanning: true, error: null }));

    const registerListener = async () => {
      try {
        console.log("Registering NFC tag event listener...");
        await NfcManager.registerTagEvent({
          invalidateAfterFirstRead: true,
        });
        tagEventRegisteredRef.current = true;
        console.log("NFC tag event listener registered");
      } catch (error) {
        tagEventRegisteredRef.current = false;
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to start NFC scanning";
        setNfcState((prev) => ({
          ...prev,
          isScanning: false,
          error: errorMessage,
        }));
        console.error("Failed to register NFC tag event:", error);
      }
    };

    registerListener();
  }, [nfcState.isSupported, nfcState.isEnabled]);

  return {
    ...nfcState,
    startScanning,
  };
}
