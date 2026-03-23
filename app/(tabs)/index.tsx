import { useAppState } from "@/contexts/AppStateContext";
import { useNFC } from "@/hooks/useNFC";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  View,
} from "react-native";
import { useAuth0 } from "react-native-auth0";

// Module-level lock — lives outside React's render cycle so it's truly synchronous
let _isProcessingTag = false;

export default function ScanCardScreen() {
  const { user, clearCredentials } = useAuth0();

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
    setIsChecking(true); // set immediately so spinner shows with no grey flash
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
    isScanning || isChecking ? "#2EA6FF" : !nfcEnabled ? "#444" : "#555";

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#050A10", "#0D1520", "#050A10"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.headerTitle}>Driver Onboarding</Text>
          {user?.email && <Text style={styles.headerEmail}>{user.email}</Text>}
        </View>
      </View>

      <View style={styles.content}>
        {/* Main scan area */}
        {!apiError && (
          <View style={styles.scanArea}>
            <Text style={styles.title}>Scan ID Tag</Text>
            <Text style={styles.subtitle}>
              Assign or replace a driver's NFC card
            </Text>

            {isChecking ? (
              <ActivityIndicator
                size={80}
                color="#2EA6FF"
                style={styles.icon}
              />
            ) : (
              <Animated.View
                style={[styles.icon, { transform: [{ scale: pulseAnim }] }]}
              >
                {isScanning && <View style={styles.glowRing} />}
                <MaterialCommunityIcons
                  name="access-point"
                  size={200}
                  color={iconColor}
                />
              </Animated.View>
            )}

            <Text style={styles.statusText}>{statusText}</Text>

            {nfcError && (
              <Text style={styles.errorTextSmall}>NFC Error: {nfcError}</Text>
            )}
          </View>
        )}

        {/* API / network error */}
        {apiError && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons name="wifi-off" size={28} color="#FF6B6B" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorBody}>{apiError}</Text>
            <Pressable style={styles.outlineBtn} onPress={handleDismissError}>
              <Text style={styles.outlineBtnText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Logout bottom right */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <MaterialCommunityIcons
          name="logout"
          size={16}
          color="rgba(255,255,255,0.4)"
        />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050A10" },

  header: {
    paddingTop: 44,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: { width: 30, height: 30 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "600" },
  headerEmail: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  scanArea: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "white",
    fontSize: 35,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  icon: {
    marginVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  glowRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(46,166,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(46,166,255,0.2)",
  },
  statusText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  errorTextSmall: {
    color: "#FF6B6B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },

  errorBox: {
    width: "100%",
    backgroundColor: "rgba(255,107,107,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  errorTitle: {
    color: "#FF6B6B",
    fontWeight: "700",
    fontSize: 17,
    marginTop: 4,
  },
  errorBody: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },

  outlineBtn: {
    width: "100%",
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    fontSize: 14,
  },

  logoutBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 8,
  },
  logoutText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
  },
});
