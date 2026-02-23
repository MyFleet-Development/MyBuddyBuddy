import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth0 } from "react-native-auth0";

import { useAppState } from "@/contexts/AppStateContext";
import { useNFC } from "@/hooks/useNFC";

export default function ScanCardScreen() {
  const { user, clearCredentials } = useAuth0();

  // useNFC hook provides NFC status and controls, and updates AppStateContext with detected tags
  const {
    isSupported: nfcSupported,
    isEnabled: nfcEnabled,
    isScanning,
    startScanning,
    stopScanning,
    error: nfcError,
  } = useNFC();

  // lastTag is set by the useNFC hook via AppStateContext when a tag is detected
  const { state: appState, setLastTag } = useAppState();

  // Prevent double navigation on some Android devices
  const hasNavigatedRef = React.useRef(false);

  const handleLogout = async () => {
    try {
      await clearCredentials();
      router.replace("/login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  // Auto-start scanning once NFC is ready, stop on unmount
  React.useEffect(() => {
    if (nfcSupported && nfcEnabled && !isScanning) {
      startScanning();
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfcSupported, nfcEnabled]);

  // Reset navigation guard each time this screen mounts
  React.useEffect(() => {
    hasNavigatedRef.current = false;
  }, []);

  // Watch for a detected tag via appState and navigate to DriverDetails
  React.useEffect(() => {
    if (!appState.lastTag) return;

    const tagId = appState.lastTag.id;

    // Clear the tag so it doesn't re-trigger on re-render
    setLastTag(null);

    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.push({
        pathname: "/DriverDetails",
        params: { tagId },
      });
    }
  }, [appState.lastTag, setLastTag]);

  const statusText = (() => {
    if (!nfcSupported) return "NFC not supported on this device";
    if (!nfcEnabled) return "NFC is disabled in system settings";
    if (isScanning) return "Scanning… tap your ID tag on the phone";
    return "Ready to scan";
  })();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#050A10", "#0A0F16", "#050A10"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Driver Onboarding</Text>
      </View>

      <View style={styles.content}>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoLabel}>Logged in as:</Text>
            <Text style={styles.userInfoText}>
              {user.name || user.email || "User"}
            </Text>
            {user.name && user.email && (
              <Text style={styles.userInfoEmail}>{user.email}</Text>
            )}
          </View>
        )}

        <Text style={styles.title}>Scan your ID tag</Text>

        <MaterialCommunityIcons
          name="access-point"
          size={110}
          color={isScanning ? "#2EA6FF" : "#666666"}
          style={{ marginTop: 26 }}
        />

        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 14 }}>
          {statusText}
        </Text>

        {nfcError ? (
          <Text style={{ color: "#FF6B6B", marginTop: 8 }}>{nfcError}</Text>
        ) : null}

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/DriverDetails")}
        >
          <Text style={styles.primaryButtonText}>Go to Driver Details</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleLogout}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </Pressable>
      </View>
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
  headerIcon: { width: 26, height: 26 },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "600" },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },

  userInfo: {
    marginBottom: 32,
    padding: 16,
    backgroundColor: "rgba(46, 166, 255, 0.1)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2EA6FF",
    width: "100%",
  },
  userInfoLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  userInfoText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  userInfoEmail: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },

  primaryButton: {
    marginTop: 18,
    height: 44,
    width: 220,
    borderRadius: 6,
    backgroundColor: "#2EA6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#0A0F16",
    fontWeight: "700",
  },

  secondaryButton: {
    marginTop: 12,
    height: 44,
    width: 220,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  secondaryButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
});
