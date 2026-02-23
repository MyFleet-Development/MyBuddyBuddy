import React, { createContext, useCallback, useContext, useReducer } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NFCTag {
  id: string;
  reversedId: string;
  techTypes: string[];
  ndefMessage?: any[];
}

interface AppState {
  lastTag: NFCTag | null;
  signInButtonPressed: boolean;
  scanningStopped: boolean;
}

interface AppStateContextValue {
  state: AppState;
  setLastTag: (tag: NFCTag | null) => void;
  setSignInButtonPressed: (pressed: boolean) => void;
  setScanningStopped: (stopped: boolean) => void;
  resetNFCFlags: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: AppState = {
  lastTag: null,
  signInButtonPressed: false,
  scanningStopped: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LAST_TAG'; payload: NFCTag | null }
  | { type: 'SET_SIGN_IN_BUTTON_PRESSED'; payload: boolean }
  | { type: 'SET_SCANNING_STOPPED'; payload: boolean }
  | { type: 'RESET_NFC_FLAGS' };

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
    default:
      return state;
  }
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

  return (
    <AppStateContext.Provider
      value={{ state, setLastTag, setSignInButtonPressed, setScanningStopped, resetNFCFlags }}
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