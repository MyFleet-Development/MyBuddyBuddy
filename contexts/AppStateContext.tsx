import * as Application from 'expo-application';
import React, { createContext, useCallback, useContext, useReducer } from 'react';
import { Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NFCTag {
  id: string;
  reversedId: string;
  techTypes: string[];
  ndefMessage?: any[];
}

interface ClientConfig {
  clientID: number;
  name: string;
  logo: string;
}

interface AppState {
  lastTag: NFCTag | null;
  signInButtonPressed: boolean;
  scanningStopped: boolean;
  clientConfig: ClientConfig | null;
  isInitialised: boolean;
  initialiseError: string | null;
}

interface AppStateContextValue {
  state: AppState;
  setLastTag: (tag: NFCTag | null) => void;
  setSignInButtonPressed: (pressed: boolean) => void;
  setScanningStopped: (stopped: boolean) => void;
  resetNFCFlags: () => void;
  initialise: () => Promise<void>;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: AppState = {
  lastTag: null,
  signInButtonPressed: false,
  scanningStopped: false,
  clientConfig: null,
  isInitialised: false,
  initialiseError: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LAST_TAG'; payload: NFCTag | null }
  | { type: 'SET_SIGN_IN_BUTTON_PRESSED'; payload: boolean }
  | { type: 'SET_SCANNING_STOPPED'; payload: boolean }
  | { type: 'RESET_NFC_FLAGS' }
  | { type: 'SET_CLIENT_CONFIG'; payload: ClientConfig }
  | { type: 'SET_INITIALISE_ERROR'; payload: string };

function appStateReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LAST_TAG':
      return { ...state, lastTag: action.payload };
    case 'SET_SIGN_IN_BUTTON_PRESSED':
      return { ...state, signInButtonPressed: action.payload };
    case 'SET_SCANNING_STOPPED':
      return { ...state, scanningStopped: action.payload };
    case 'RESET_NFC_FLAGS':
      return { ...state, signInButtonPressed: false, scanningStopped: false, lastTag: null };
    case 'SET_CLIENT_CONFIG':
      return { ...state, clientConfig: action.payload, isInitialised: true, initialiseError: null };
    case 'SET_INITIALISE_ERROR':
      return { ...state, initialiseError: action.payload, isInitialised: false };
    default:
      return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'android') {
    return (await Application.getAndroidId()) ?? 'unknown';
  }
  return Application.ios?.identifierForVendor ?? 'unknown';
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  const setLastTag = useCallback((tag: NFCTag | null) => {
    dispatch({ type: 'SET_LAST_TAG', payload: tag });
  }, []);

  const setSignInButtonPressed = useCallback((pressed: boolean) => {
    dispatch({ type: 'SET_SIGN_IN_BUTTON_PRESSED', payload: pressed });
  }, []);

  const setScanningStopped = useCallback((stopped: boolean) => {
    dispatch({ type: 'SET_SCANNING_STOPPED', payload: stopped });
  }, []);

  const resetNFCFlags = useCallback(() => {
    dispatch({ type: 'RESET_NFC_FLAGS' });
  }, []);

  const initialise = useCallback(async () => {
    try {
      const deviceID = await getDeviceId();
      console.log('Initialising with deviceID:', deviceID);

      const response = await fetch('https://mybuddy.my-fleet.dev/api/initialise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          deviceID,
          version: '0.1',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message ?? `Server error (${response.status})`);
      }

      console.log('Initialise response:', JSON.stringify(data, null, 2));

      const { clientID, name, logo } = data.client;
      dispatch({
        type: 'SET_CLIENT_CONFIG',
        payload: { clientID, name, logo },
      });
    } catch (e: any) {
      const message = e?.message ?? 'Failed to initialise app';
      console.error('Initialise error:', message);
      dispatch({ type: 'SET_INITIALISE_ERROR', payload: message });
    }
  }, []);

  return (
    <AppStateContext.Provider
      value={{ state, setLastTag, setSignInButtonPressed, setScanningStopped, resetNFCFlags, initialise }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}