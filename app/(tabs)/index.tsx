import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth0 } from "react-native-auth0";

import NfcManager from "react-native-nfc-manager";

export default function ScanCardScreen() {
  const { user, clearCredentials } = useAuth0();

  // ✅ NFC local state
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastTagId, setLastTagId] = useState<string | null>(null);
  const [nfcError, setNfcError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await clearCredentials();
      router.replace("/login");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  // ✅ NFC init + auto start scanning
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const supported = await NfcManager.isSupported();
        if (!mounted) return;

        setNfcSupported(supported);
        if (!supported) return;

        await NfcManager.start();

        const enabled = await NfcManager.isEnabled();
        if (!mounted) return;

        setNfcEnabled(enabled);
        if (enabled) {
          startScan();
        }
      } catch (e: any) {
        if (!mounted) return;
        setNfcError(e?.message ?? "Failed to initialise NFC");
      }
    })();

    return () => {
      mounted = false;
      stopScan();
    };
  }, []);

  const startScan = async () => {
    setNfcError(null);
    setLastTagId(null);

    if (nfcSupported === false) return;
    if (nfcEnabled === false) return;
    if (isScanning) return;

    try {
      setIsScanning(true);

      await NfcManager.registerTagEvent((tag) => {
        const id = (tag as any)?.id ?? null;
        setLastTagId(id ?? "UNKNOWN");
        setIsScanning(false);

        NfcManager.unregisterTagEvent().catch(() => {});
      });
    } catch (e: any) {
      setIsScanning(false);
      setNfcError(e?.message ?? "NFC scan failed");
      NfcManager.unregisterTagEvent().catch(() => {});
      NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const stopScan = async () => {
    try {
      await NfcManager.unregisterTagEvent();
    } catch {}
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {}
    setIsScanning(false);
  };

  const statusText = (() => {
    if (nfcSupported === false) return "NFC not supported on this device";
    if (nfcEnabled === false) return "NFC is disabled in system settings";
    if (lastTagId) return `Detected ✅ (${lastTagId})`;
    if (isScanning) return "Scanning…";
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
          name={isScanning ? "nfc-tap" : "access-point"}
          size={110}
          color="#2EA6FF"
          style={{ marginTop: 26 }}
        />

        {/* ✅ simple status + error */}
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 14 }}>
          {statusText}
        </Text>
        {nfcError ? (
          <Text style={{ color: "#FF6B6B", marginTop: 8 }}>{nfcError}</Text>
        ) : null}

        {/* ✅ optional manual control (handy for testing) */}
        <Pressable
          style={{
            marginTop: 18,
            height: 44,
            width: 220,
            borderRadius: 6,
            backgroundColor: "#2EA6FF",
            alignItems: "center",
            justifyContent: "center",
            opacity: nfcSupported === false || nfcEnabled === false ? 0.5 : 1,
          }}
          onPress={isScanning ? stopScan : startScan}
        >
          <Text style={{ color: "#0A0F16", fontWeight: "700" }}>
            {isScanning ? "Stop scanning" : "Scan"}
          </Text>
        </Pressable>

        <Pressable
          style={{
            marginTop: 12,
            height: 44,
            width: 220,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.3)",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
          onPress={handleLogout}
        >
          <Text style={{ color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>
            Logout
          </Text>
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
});
