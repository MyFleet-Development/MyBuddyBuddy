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
import Auth0 from "react-native-auth0";

const auth0 = new Auth0({
  domain: "dev-ozyi8thugue5owac.us.auth0.com",
  clientId: "H94kBv9l5bUcwdeLd5tUqkrPQDQZxoQy",
});

const handleLogin = async () => {
  try {
    const credentials = await auth0.webAuth.authorize({
      scope: "openid profile email offline_access",
    });

    router.replace("/(tabs)");
  } catch (e) {
    console.log("Auth0 login error:", e);
  }
};

export default function LoginScreen() {
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

        {/* Top-left logo + title */}
        <View style={styles.header}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.headerIcon}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Driver Onboarding</Text>
        </View>

        <View style={styles.center}>
          <Pressable style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Login</Text>
          </Pressable>
        </View>

        {/* Bottom myfleet */}
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
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loginButton: {
    height: 48,
    width: 220,
    borderRadius: 6,
    backgroundColor: "#2EA6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: "#0A0F16",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    position: "absolute",
    bottom: 64,
    width: "100%",
    alignItems: "center",
  },

  footerLogo: {
    width: 140,
    height: 36,
  },
});
