import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      setIsAuthenticating(true);
      setLoginError(null);
      await authorize({
        scope: "openid profile email", // add offline_access later if needed
      });
      // Keep spinner showing - navigation will happen via useEffect when user is set
    } catch (e: any) {
      console.log("Auth0 login error:", e);
      setIsAuthenticating(false);
      
      // Handle user cancellation gracefully
      if (e.message?.includes("cancelled") || e.message?.includes("canceled")) {
        setLoginError("Login was cancelled");
      } else {
        setLoginError("Unable to login. Please try again.");
      }
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
          {isAuthenticating || user ? (
            // Show loading when auth completed or user exists
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2EA6FF" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <Text style={styles.loginButtonText}>
                  {isLoading ? "Loading..." : "Login"}
                </Text>
              </Pressable>

              {(loginError || error) && (
                <Text style={styles.errorText}>
                  {loginError || error?.message}
                </Text>
              )}
            </>
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
  loadingContainer: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  errorText: {
    color: "#FF6B6B",
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 64,
    width: "100%",
    alignItems: "center",
  },
  footerLogo: { width: 140, height: 36 },
});
