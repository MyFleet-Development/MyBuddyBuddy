import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth0 } from "react-native-auth0";

export default function LoginScreen() {
  const { authorize, error, isLoading, user } = useAuth0();

  const handleLogin = async () => {
    try {
      await authorize({
        scope: "openid profile email", // add offline_access later if needed
      });

      router.replace("/(tabs)");
    } catch (e) {
      console.log("Auth0 login error:", e);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ImageBackground
        source={require("../assets/images/adaptive-icon.png")}
        resizeMode="cover"
        style={styles.bg}
      >
        <LinearGradient
          colors={[
            "rgba(5,10,16,0.92)",
            "rgba(5,10,16,0.70)",
            "rgba(5,10,16,0.92)",
          ]}
          style={styles.overlay}
        />

        <View style={styles.header}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Driver Onboarding</Text>
        </View>

        <View style={styles.center}>
          <Pressable
            style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Loading..." : "Login"}
            </Text>
          </Pressable>

          {!!error && (
            <Text style={{ color: "tomato", marginTop: 12 }}>
              {error.message}
            </Text>
          )}

          {!!user && (
            <Text style={{ color: "white", marginTop: 12 }}>
              Logged in as {user.name}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Image
            source={require("../assets/images/nameicon.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050A10" },
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  header: {
    marginTop: 44,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: { width: 26, height: 26 },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loginButton: {
    height: 48,
    width: 220,
    borderRadius: 6,
    backgroundColor: "#2EA6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: { color: "#0A0F16", fontSize: 16, fontWeight: "600" },
  footer: {
    position: "absolute",
    bottom: 64,
    width: "100%",
    alignItems: "center",
  },
  footerLogo: { width: 140, height: 36 },
});
