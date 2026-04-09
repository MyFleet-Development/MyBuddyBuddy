import { useAppState } from "@/contexts/AppStateContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
      <View style={styles.header}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.headerIcon}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }}>
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
  const [searchQuery, setSearchQuery] = React.useState("");

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
        name="credit-card-lock"
        size={13}
        color="#60A5FA"
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
              color="#22C55E"
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
            name="credit-card-edit-outline"
            size={48}
            color="#3B82F6"
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.cardTitle}>What would you like to do?</Text>
          <Text style={styles.cardSubtitle}>tag : {tagId}</Text>

          {inUse === "true" && (
            <View style={styles.inUseBanner}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color="#F59E0B"
              />
              <Text style={styles.inUseBannerText}>
                Warning: This tag is already assigned to a driver. You can
                replace it with a new driver, or assign it to an existing driver
                below.
              </Text>
            </View>
          )}

          <View style={styles.choiceGroup}>
            <Pressable style={styles.choiceCard} onPress={() => setMode("add")}>
              <View style={styles.choiceCardIcon}>
                <MaterialCommunityIcons
                  name="account-plus"
                  size={26}
                  color="#3B82F6"
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
                color="#9CA3AF"
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
                  color="#3B82F6"
                />
              </View>
              <View style={styles.choiceCardText}>
                <Text style={styles.choiceCardTitle}>
                  {inUse === "true"
                    ? "Reassign Tag"
                    : "Assign to Existing Driver"}
                </Text>
                <Text style={styles.choiceCardDesc}>
                  {inUse === "true"
                    ? "Assign this tag to a different existing driver"
                    : "Assign this tag to an existing driver"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9CA3AF"
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
              placeholderTextColor="#4B5563"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Driver PIN</Text>
            <TextInput
              value={driverPin}
              onChangeText={setDriverPin}
              style={styles.input}
              placeholder="Enter PIN"
              placeholderTextColor="#4B5563"
              secureTextEntry
              keyboardType="numeric"
            />
          </View>

          {addError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color="#D7282F"
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
                <ActivityIndicator color="#fff" />
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
  const filteredDrivers = drivers.filter((d) =>
    d.driverName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Screen email={user?.email}>
      <View style={styles.replaceCard}>
        <Text style={styles.cardTitle}>Reassign Tag</Text>
        <Text style={styles.cardSubtitle}>
          Select a driver to assign this tag to: {tagId}
        </Text>

        {/* Search bar + list as one seamless container */}
        <View style={styles.listContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#4B5563" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search drivers..."
              placeholderTextColor="#4B5563"
              style={styles.searchInput}
            />
          </View>

          {isLoadingDrivers && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#3B82F6" size="large" />
              <Text style={styles.loadingText}>Loading drivers…</Text>
            </View>
          )}

          {loadDriversError && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color="#D7282F"
              />
              <Text style={styles.errorText}>{loadDriversError}</Text>
              <Pressable style={styles.retryBtn} onPress={fetchDrivers}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {!isLoadingDrivers && !loadDriversError && (
            <FlatList
              data={filteredDrivers}
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
                        color="#3B82F6"
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
                    color="#374151"
                  />
                  <Text style={styles.emptyListText}>
                    {searchQuery
                      ? "No drivers match your search"
                      : "No drivers found"}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {replaceError && (
          <View style={styles.errorBox}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={16}
              color="#D7282F"
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
              <ActivityIndicator color="#fff" />
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

  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // ─── Card containers ──────────────────────────────────────────────────────────
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

  // ─── Typography ───────────────────────────────────────────────────────────────
  cardTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
  },

  // ─── Tag badge ────────────────────────────────────────────────────────────────
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0F121A",
    borderWidth: 1,
    borderColor: "#1F2430",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  tagBadgeText: {
    color: "#60A5FA",
    fontSize: 11,
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },

  // ─── In use banner ────────────────────────────────────────────────────────────
  inUseBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A1505",
    borderWidth: 1,
    borderColor: "#92400E",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  inUseBannerText: {
    color: "#F59E0B",
    fontSize: 13,
    flex: 1,
  },

  // ─── Choice cards ─────────────────────────────────────────────────────────────
  choiceGroup: {
    width: "100%",
    gap: 10,
    marginBottom: 16,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#1F2430",
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  choiceCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0F121A",
    borderWidth: 1,
    borderColor: "#1F2430",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCardText: { flex: 1 },
  choiceCardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  choiceCardDesc: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },

  // ─── Form ─────────────────────────────────────────────────────────────────────
  fieldGroup: {
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1F2430",
    paddingHorizontal: 14,
    color: "#fff",
    backgroundColor: "#0F121A",
    marginBottom: 14,
    fontSize: 15,
  },

  // ─── Search + list container ──────────────────────────────────────────────────
  listContainer: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2430",
    overflow: "hidden",
    marginTop: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2430",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    height: "100%",
  },

  // ─── Driver list ──────────────────────────────────────────────────────────────
  driverList: {
    flex: 1,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2430",
    gap: 12,
  },
  driverRowSelected: {
    backgroundColor: "#0F121A",
  },
  driverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#0F121A",
    borderWidth: 1,
    borderColor: "#1F2430",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarSelected: {
    backgroundColor: "#1D3461",
    borderColor: "#3B82F6",
  },
  driverAvatarText: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "800",
  },
  driverRowText: {
    flex: 1,
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "700",
  },
  driverRowTextSelected: {
    color: "#fff",
    fontWeight: "800",
  },

  // ─── Loading / empty ──────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyList: {
    alignItems: "center",
    paddingTop: 48,
    gap: 10,
  },
  emptyListText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },

  // ─── Success ──────────────────────────────────────────────────────────────────
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "#0F121A",
    borderWidth: 1,
    borderColor: "#1F2430",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8,
  },
  successBody: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },

  // ─── Error ────────────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A0A0A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7F1D1D",
    padding: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },
  retryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2A3242",
    backgroundColor: "#0B0B0D",
  },
  retryBtnText: {
    color: "#C7D2FE",
    fontSize: 12,
    fontWeight: "700",
  },

  // ─── Actions ──────────────────────────────────────────────────────────────────
  actions: {
    gap: 10,
    paddingTop: 8,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  btnDisabled: {
    backgroundColor: "#1D3461",
  },
  cancelBtn: {
    height: 44,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2A3242",
    backgroundColor: "#0B0B0D",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#C7D2FE",
    fontSize: 14,
    fontWeight: "700",
  },
});
