import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function DriverDetailsScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#050A10", "#0A0F16", "#050A10"]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Driver Onboarding</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver Details</Text>

          <Text style={styles.metaText}>Tag Serial #: XXXXXXXXXXXXXXXXXXX</Text>

          <Text style={styles.label}>Driver Name</Text>
          <TextInput
            value={""}
            onChangeText={() => {}}
            style={styles.input}
            placeholder="Enter name here"
            placeholderTextColor="rgba(255,255,255,0.35)"
          />

          <Text style={styles.label}>Driver PIN</Text>
          <TextInput
            value={""}
            onChangeText={() => {}}
            style={styles.input}
            placeholder="Enter PIN here"
            placeholderTextColor="rgba(255,255,255,0.35)"
            secureTextEntry
          />

          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={() => {}}>
              <Text style={styles.primaryBtnText}>Add driver</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
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

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  card: {
    flex: 1,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#2B3138",
    padding: 18,
    justifyContent: "flex-start",
  },

  cardTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  metaText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 16,
  },

  label: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginBottom: 6,
  },

  input: {
    height: 42,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#2EA6FF",
    paddingHorizontal: 10,
    color: "white",
    backgroundColor: "rgba(0,0,0,0.10)",
    marginBottom: 14,
  },

  actions: {
    marginTop: 18,
    gap: 10,
  },

  primaryBtn: {
    height: 44,
    borderRadius: 6,
    backgroundColor: "#2EA6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#0A0F16",
    fontSize: 15,
    fontWeight: "700",
  },

  secondaryBtn: {
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  secondaryBtnText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
  },
});
