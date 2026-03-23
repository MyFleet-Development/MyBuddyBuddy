import { AppStateProvider, useAppState } from "@/contexts/AppStateContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Auth0Provider, useAuth0 } from "react-native-auth0";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Separate component so it can use both useAuth0 and useAppState hooks
function AppInitialiser({ children }: { children: React.ReactNode }) {
  const { user } = useAuth0();
  const { initialise, state } = useAppState();

  // Call initialise whenever a user logs in and we don't have config yet
  React.useEffect(() => {
    if (user && !state.isInitialised) {
      initialise();
    }
  }, [user, state.isInitialised]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Auth0Provider
      domain="myfleet.au.auth0.com"
      clientId="GqPuIYaGsGub4jFFmRepafZLi6PoAXv3"
    >
      <AppStateProvider>
        <AppInitialiser>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="DriverDetails" />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </AppInitialiser>
      </AppStateProvider>
    </Auth0Provider>
  );
}
