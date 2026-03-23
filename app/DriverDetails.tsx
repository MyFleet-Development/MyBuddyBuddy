import { useAppState } from "@/contexts/AppStateContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth0 } from "react-native-auth0";

type Mode = "choose" | "add" | "replace";

interface Driver {
  driverId: number;
  driverName: string;
}

// ─── Shared layout wrapper ────────────────────────────────────────────────────
function Screen({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string;
}) {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#050A10", "#0D1520", "#050A10"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.header}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.headerTitle}>Driver Onboarding</Text>
          {email && <Text style={styles.headerEmail}>{email}</Text>}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export default function DriverDetailsScreen() {
  const {
    tagId,
    mode: modeParam,
    inUse,
  } = useLocalSearchParams<{
    tagId: string;
    mode?: string;
    inUse?: string;
  }>();
  const { user } = useAuth0();
  const { state: appState } = useAppState();
  const clientId = appState.clientConfig?.clientID ?? 1;

  const [mode, setMode] = React.useState<Mode>(
    modeParam === "replace" ? "replace" : "choose",
  );

  // ─── Add state ────────────────────────────────────────────────────────────────
  const [driverName, setDriverName] = React.useState("");
  const [driverPin, setDriverPin] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  // ─── Replace state ────────────────────────────────────────────────────────────
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = React.useState(false);
  const [loadDriversError, setLoadDriversError] = React.useState<string | null>(
    null,
  );
  const [selectedDriver, setSelectedDriver] = React.useState<Driver | null>(
    null,
  );
  const [isReplacing, setIsReplacing] = React.useState(false);
  const [replaceError, setReplaceError] = React.useState<string | null>(null);

  // ─── Success state ────────────────────────────────────────────────────────────
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (mode === "replace") fetchDrivers();
  }, [mode]);

  const fetchDrivers = async () => {
    setIsLoadingDrivers(true);
    setLoadDriversError(null);
    try {
      const response = await fetch(
        `https://mybuddy.my-fleet.dev/api/driver?clientid=${clientId}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.message ?? `Server error (${response.status})`);
      const unique = data.filter(
        (driver: Driver, index: number, self: Driver[]) =>
          index === self.findIndex((d) => d.driverId === driver.driverId),
      );
      setDrivers(unique);
    } catch (e: any) {
      setLoadDriversError(
        e?.message ?? "Failed to load drivers. Please try again.",
      );
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  const handleAdd = async () => {
    if (!driverName.trim()) {
      setAddError("Please enter a driver name.");
      return;
    }
    if (!driverPin.trim()) {
      setAddError("Please enter a driver PIN.");
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      const response = await fetch("https://mybuddy.my-fleet.dev/api/driver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          driverPin,
          tagId,
          driverName: driverName.trim(),
          user: user?.email ?? "",
          clientId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.message ?? `Server error (${response.status})`);
      setSuccessMessage(
        `${driverName.trim()} has been added and assigned to tag ${tagId}.`,
      );
    } catch (e: any) {
      setAddError(e?.message ?? "Failed to add driver. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleReplace = async () => {
    if (!selectedDriver) {
      setReplaceError("Please select a driver from the list.");
      return;
    }

    setIsReplacing(true);
    setReplaceError(null);
    try {
      const response = await fetch(
        "https://mybuddy.my-fleet.dev/api/driver/tag",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            tagId,
            driverId: selectedDriver.driverId,
            clientId,
          }),
        },
      );
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok)
        throw new Error(data?.message ?? `Server error (${response.status})`);
      setSuccessMessage(
        `Tag ${tagId} has been assigned to ${selectedDriver.driverName}.`,
      );
    } catch (e: any) {
      setReplaceError(
        e?.message ?? "Failed to replace card. Please try again.",
      );
    } finally {
      setIsReplacing(false);
    }
  };

  // ─── Tag ID badge ─────────────────────────────────────────────────────────────
  const TagBadge = () => (
    <View style={styles.tagBadge}>
      <MaterialCommunityIcons
        name="credit-card-wireless"
        size={13}
        color="#2EA6FF"
      />
      <Text style={styles.tagBadgeText}>{tagId}</Text>
    </View>
  );

  // ─── Success ──────────────────────────────────────────────────────────────────
  if (successMessage) {
    return (
      <Screen email={user?.email}>
        <View style={styles.centeredCard}>
          <View style={styles.successIcon}>
            <MaterialCommunityIcons
              name="check-circle"
              size={64}
              color="#2EA6FF"
            />
          </View>
          <Text style={styles.successTitle}>All Done!</Text>
          <Text style={styles.successBody}>{successMessage}</Text>
          <Pressable
            style={[styles.primaryBtn, { width: 160 }]}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.primaryBtnText}>Home</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ─── Choose ───────────────────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <Screen email={user?.email}>
        <View style={styles.centeredCard}>
          <MaterialCommunityIcons
            name="credit-card-wireless"
            size={48}
            color="#2EA6FF"
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.cardTitle}>What would you like to do?</Text>
          <Text style={styles.cardSubtitle}>with this tag</Text>
          <TagBadge />

          {/* Warning banner when tag is already in use */}
          {inUse === "true" && (
            <View style={styles.inUseBanner}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color="#FF9500"
              />
              <Text style={styles.inUseBannerText}>
                This tag is already assigned to a driver. You can replace it
                with a new driver, or assign it to an existing driver below.
              </Text>
            </View>
          )}

          <View style={styles.choiceGroup}>
            <Pressable style={styles.choiceCard} onPress={() => setMode("add")}>
              <View style={styles.choiceCardIcon}>
                <MaterialCommunityIcons
                  name="account-plus"
                  size={26}
                  color="#2EA6FF"
                />
              </View>
              <View style={styles.choiceCardText}>
                <Text style={styles.choiceCardTitle}>Add New Driver</Text>
                <Text style={styles.choiceCardDesc}>
                  Create a new driver and assign this tag
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="rgba(255,255,255,0.3)"
              />
            </Pressable>

            <Pressable
              style={styles.choiceCard}
              onPress={() => setMode("replace")}
            >
              <View style={styles.choiceCardIcon}>
                <MaterialCommunityIcons
                  name="account-switch"
                  size={26}
                  color="#2EA6FF"
                />
              </View>
              <View style={styles.choiceCardText}>
                <Text style={styles.choiceCardTitle}>Reassign Tag</Text>
                <Text style={styles.choiceCardDesc}>
                  Assign this tag to an existing driver
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="rgba(255,255,255,0.3)"
              />
            </Pressable>
          </View>

          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // ─── Add ──────────────────────────────────────────────────────────────────────
  if (mode === "add") {
    return (
      <Screen email={user?.email}>
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Add New Driver</Text>
          <Text style={styles.cardSubtitle}>Fill in the details below</Text>
          <TagBadge />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Driver Name</Text>
            <TextInput
              value={driverName}
              onChangeText={setDriverName}
              style={styles.input}
              placeholder="Enter full name"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Driver PIN</Text>
            <TextInput
              value={driverPin}
              onChangeText={setDriverPin}
              style={styles.input}
              placeholder="Enter PIN"
              placeholderTextColor="rgba(255,255,255,0.25)"
              secureTextEntry
              keyboardType="numeric"
            />
          </View>

          {addError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color="#FF6B6B"
              />
              <Text style={styles.errorText}>{addError}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, isAdding && styles.btnDisabled]}
              onPress={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator color="#0A0F16" />
              ) : (
                <Text style={styles.primaryBtnText}>Add Driver</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setMode("choose")}
            >
              <Text style={styles.cancelBtnText}>Back</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  // ─── Replace ──────────────────────────────────────────────────────────────────
  return (
    <Screen email={user?.email}>
      <View style={styles.replaceCard}>
        <Text style={styles.cardTitle}>Reassign Tag</Text>
        <Text style={styles.cardSubtitle}>
          Select a driver to assign this tag to: {tagId}
        </Text>

        {isLoadingDrivers && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#2EA6FF" size="large" />
            <Text style={styles.loadingText}>Loading drivers…</Text>
          </View>
        )}

        {loadDriversError && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color="#FF6B6B"
            />
            <Text style={styles.errorText}>{loadDriversError}</Text>
            <Pressable style={styles.retryBtn} onPress={fetchDrivers}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoadingDrivers && !loadDriversError && (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item.driverId.toString()}
            style={styles.driverList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedDriver?.driverId === item.driverId;
              return (
                <Pressable
                  style={[
                    styles.driverRow,
                    isSelected && styles.driverRowSelected,
                  ]}
                  onPress={() => setSelectedDriver(item)}
                >
                  <View
                    style={[
                      styles.driverAvatar,
                      isSelected && styles.driverAvatarSelected,
                    ]}
                  >
                    <Text style={styles.driverAvatarText}>
                      {item.driverName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.driverRowText,
                      isSelected && styles.driverRowTextSelected,
                    ]}
                  >
                    {item.driverName}
                  </Text>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color="#2EA6FF"
                    />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <MaterialCommunityIcons
                  name="account-off-outline"
                  size={36}
                  color="rgba(255,255,255,0.2)"
                />
                <Text style={styles.emptyListText}>No drivers found</Text>
              </View>
            }
          />
        )}

        {replaceError && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color="#FF6B6B"
            />
            <Text style={styles.errorText}>{replaceError}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.primaryBtn,
              (!selectedDriver || isReplacing) && styles.btnDisabled,
            ]}
            onPress={handleReplace}
            disabled={!selectedDriver || isReplacing}
          >
            {isReplacing ? (
              <ActivityIndicator color="#0A0F16" />
            ) : (
              <Text style={styles.primaryBtnText}>Confirm Reassignment</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => setMode("choose")}>
            <Text style={styles.cancelBtnText}>Back</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
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
    marginTop: 1,
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  centeredCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  formCard: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  replaceCard: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 16,
  },

  cardTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },

  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(46,166,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(46,166,255,0.25)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  tagBadgeText: {
    color: "#2EA6FF",
    fontSize: 11,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },

  // ─── In use banner ────────────────────────────────────────────────────────────
  inUseBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,149,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,149,0,0.25)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  inUseBannerText: {
    color: "#FF9500",
    fontSize: 13,
    flex: 1,
  },

  choiceGroup: {
    width: "100%",
    gap: 10,
    marginBottom: 16,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  choiceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(46,166,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCardText: { flex: 1 },
  choiceCardTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  choiceCardDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },

  fieldGroup: {
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    color: "white",
    backgroundColor: "rgba(255,255,255,0.05)",
    marginBottom: 14,
    fontSize: 15,
  },

  driverList: {
    flex: 1,
    marginTop: 8,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    gap: 12,
  },
  driverRowSelected: {
    borderColor: "#2EA6FF",
    backgroundColor: "rgba(46,166,255,0.08)",
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarSelected: {
    backgroundColor: "rgba(46,166,255,0.2)",
  },
  driverAvatarText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: "600",
  },
  driverRowText: {
    flex: 1,
    color: "rgba(255,255,255,0.75)",
    fontSize: 15,
  },
  driverRowTextSelected: {
    color: "white",
    fontWeight: "600",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },
  emptyList: {
    alignItems: "center",
    paddingTop: 48,
    gap: 10,
  },
  emptyListText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 14,
  },

  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(46,166,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  successBody: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,107,107,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.2)",
    padding: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 13,
    flex: 1,
  },
  retryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  retryBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },

  actions: {
    gap: 10,
    paddingTop: 8,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: "#2EA6FF",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#0A0F16",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    backgroundColor: "rgba(46,166,255,0.25)",
  },
  cancelBtn: {
    height: 44,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
});
