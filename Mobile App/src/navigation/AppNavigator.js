import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Home, Search, User, PlayCircle } from "lucide-react-native";

import HomeScreen from "../screens/HomeScreen";
import DetailsScreen from "../screens/DetailsScreen";
import PlayerScreen from "../screens/PlayerScreen";
import LoginScreen from "../screens/LoginScreen";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator } from "react-native";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: "#000", borderTopColor: "#333" },
      tabBarActiveTintColor: "#E50914",
      tabBarInactiveTintColor: "#888",
    }}
  >
    <Tab.Screen
      name="HomeTab"
      component={HomeScreen}
      options={{
        tabBarLabel: "Home",
        tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Search"
      component={HomeScreen} // Placeholder
      options={{
        tabBarLabel: "Search",
        tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={HomeScreen} // Placeholder
      options={{
        tabBarLabel: "Profile",
        tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}
      >
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={HomeTabs} />
          <Stack.Screen name="Details" component={DetailsScreen} />
          <Stack.Screen name="Player" component={PlayerScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
