import { useAppState } from "@/contexts/AppStateContext";
import { useNFC } from "@/hooks/useNFC";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useAuth0 } from "react-native-auth0";

// Module-level lock — lives outside React's render cycle so it's truly synchronous
let _isProcessingTag = false;

export default function ScanCardScreen() {
  const { user, clearCredentials } = useAuth0();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const {
    isSupported: nfcSupported,
    isEnabled: nfcEnabled,
    isScanning,
    startScanning,
    error: nfcError,
  } = useNFC();

  const { state: appState, setLastTag } = useAppState();
  const clientId = appState.clientConfig?.clientID ?? 1;

  const [isChecking, setIsChecking] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  // Pulse animation for the scan icon
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isScanning || isChecking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isScanning, isChecking]);

  const handleLogout = async () => {
    try {
      await clearCredentials();
      router.replace("/login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  // Restart scanning every time screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      _isProcessingTag = false;
      setApiError(null);
      setIsChecking(false);
      setLastTag(null);
      if (nfcSupported && nfcEnabled) {
        startScanning();
      }
    }, [nfcSupported, nfcEnabled]),
  );

  // Reset state each time screen mounts
  React.useEffect(() => {
    _isProcessingTag = false;
    setApiError(null);
    setIsChecking(false);
    setLastTag(null);
  }, []);

  // Watch for a detected tag and call the API
  React.useEffect(() => {
    if (!appState.lastTag) return;

    if (_isProcessingTag) {
      console.log("Already processing a tag - ignoring duplicate");
      setLastTag(null);
      return;
    }

    _isProcessingTag = true;
    const tagId = appState.lastTag.id;
    setLastTag(null);
    setIsChecking(true);
    checkTag(tagId);
  }, [appState.lastTag]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkTag = async (tagId: string) => {
    setApiError(null);

    try {
      const response = await fetch(
        "https://mybuddy.my-fleet.dev/api/driver/check-tag",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            tagId: tagId,
            clientId: clientId,
          }),
        },
      );

      const data = await response.json();
      console.log("check-tag response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data?.message ?? `Server error (${response.status})`);
      }

      setIsChecking(false);

      router.push({
        pathname: "/DriverDetails",
        params: { tagId, inUse: data.inUse ? "true" : "false" },
      });
    } catch (e: any) {
      _isProcessingTag = false;
      setApiError(e?.message ?? "Network error. Please try again.");
      setIsChecking(false);
      startScanning();
    }
  };

  const handleDismissError = () => {
    _isProcessingTag = false;
    setApiError(null);
    startScanning();
  };

  const statusText = (() => {
    if (!nfcSupported) return "NFC not supported on this device";
    if (!nfcEnabled) return "NFC is disabled — check your settings";
    if (isChecking) return "Checking tag…";
    if (isScanning) return "Hold your card to device's NFC reader";
    return "Scanning...";
  })();

  const iconColor =
    isScanning || isChecking ? "#3B82F6" : !nfcEnabled ? "#333" : "#444";

  const iconSize = Math.min(width, height) * 0.38;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, isLandscape && styles.headerLandscape]}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Driver Onboarding</Text>
          {user?.email && <Text style={styles.headerEmail}>{user.email}</Text>}
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={16} color="#9CA3AF" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!apiError && (
          <View style={styles.card}>
            <Text style={[styles.title, isLandscape && styles.titleLandscape]}>
              Scan ID Tag
            </Text>
            <Text
              style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}
            >
              Assign or replace a driver's NFC card
            </Text>

            {isChecking ? (
              <ActivityIndicator
                size={isLandscape ? 60 : 80}
                color="#3B82F6"
                style={styles.icon}
              />
            ) : (
              <Animated.View
                style={[styles.icon, { transform: [{ scale: pulseAnim }] }]}
              >
                {isScanning && (
                  <View
                    style={[
                      styles.glowRing,
                      {
                        width: iconSize * 1.3,
                        height: iconSize * 1.3,
                        borderRadius: iconSize * 0.65,
                      },
                    ]}
                  />
                )}
                <MaterialCommunityIcons
                  name="access-point"
                  size={iconSize}
                  color={iconColor}
                />
              </Animated.View>
            )}

            <Text
              style={[
                styles.statusText,
                isLandscape && styles.statusTextLandscape,
              ]}
            >
              {statusText}
            </Text>

            {nfcError && (
              <Text style={styles.errorTextSmall}>NFC Error: {nfcError}</Text>
            )}
          </View>
        )}

        {apiError && (
          <View style={styles.errorCard}>
            <MaterialCommunityIcons name="wifi-off" size={28} color="#D7282F" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorBody}>{apiError}</Text>
            <Pressable style={styles.outlineBtn} onPress={handleDismissError}>
              <Text style={styles.outlineBtnText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D" },

  // ─── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingTop: 44,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2430",
  },
  headerLandscape: {
    paddingTop: 16,
  },
  headerIcon: { width: 30, height: 30 },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  headerEmail: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 1,
  },

  // ─── Logout ───────────────────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1F2430",
    backgroundColor: "#0F121A",
  },
  logoutText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },

  // ─── Content ─────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // ─── Scan card ────────────────────────────────────────────────────────────────
  card: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  titleLandscape: {
    fontSize: 20,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitleLandscape: {
    fontSize: 12,
    marginBottom: 4,
  },
  icon: {
    marginVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    backgroundColor: "rgba(59,130,246,0.07)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  statusText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },
  statusTextLandscape: {
    fontSize: 12,
  },
  errorTextSmall: {
    color: "#D7282F",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },

  // ─── Error card ───────────────────────────────────────────────────────────────
  errorCard: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#2A1A1A",
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  errorTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  errorBody: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  outlineBtn: {
    width: "100%",
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A3242",
    backgroundColor: "#0B0B0D",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    color: "#C7D2FE",
    fontWeight: "700",
    fontSize: 14,
  },
});
