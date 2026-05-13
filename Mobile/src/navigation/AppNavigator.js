import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Feather from '@expo/vector-icons/Feather';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import HomeScreen from "../screens/HomeScreen";
import DetailsScreen from "../screens/DetailsScreen";
import PlayerScreen from "../screens/PlayerScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useAuth } from "../context/AuthContext";
import { View, ActivityIndicator, StyleSheet, Pressable, Text, Dimensions } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { bottom: insets.bottom + 2 }]}>
      <View style={styles.tabBarPill}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && { opacity: 0.7 }
              ]}
            >
              {isFocused && <View style={styles.activeIndicator} />}
              {options.tabBarIcon({
                color: isFocused ? "#fff" : "rgba(255,255,255,0.5)",
                size: 20,
                focused: isFocused
              })}
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? "#fff" : "rgba(255,255,255,0.5)" }
              ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const HomeTabs = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="HomeTab"
      component={HomeScreen}
      options={{
        tabBarLabel: "Home",
        tabBarIcon: ({ color, size, focused }) => (
          <Octicons name={focused ? "home-fill" : "home"} color={color} size={size} />
        ),
      }}
    />
    <Tab.Screen
      name="Telegram"
      component={HomeScreen} // Placeholder
      options={{
        tabBarLabel: "Contact",
        tabBarIcon: ({ color, size, focused }) => (<FontAwesome5 name={focused ? "telegram" : "telegram-plane"} color={color} size={size - 2} />
        ),
      }}
    />
    <Tab.Screen
      name="Search"
      component={HomeScreen} // Placeholder
      options={{
        tabBarLabel: "Search",
        tabBarIcon: ({ color, size, focused }) => (focused ? <Ionicons name="search-circle-sharp" size={size + 5} color={color} /> : <Feather name="search" color={color} size={size} />),
      }}
    />
    <Tab.Screen
      name="Downloads"
      component={HomeScreen} // Placeholder
      options={{
        tabBarLabel: "Downloads",
        tabBarIcon: ({ color, size }) => <Feather name="download" color={color} size={size} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: "Profile",
        tabBarIcon: ({ color, size, focused }) => (
          focused
            ? <FontAwesome5 name="user-alt" color={color} size={size - 4} />
            : <Feather name="user" color={color} size={size} />
        ),
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

  // Always register main screens so navigation.reset can target them even when
  // the user is not authenticated yet. Use initialRouteName to decide which
  // screen is shown first based on auth state.
  return (
    <Stack.Navigator
      initialRouteName={user ? 'Main' : 'Login'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Main" component={HomeTabs} />
      <Stack.Screen name="Details" component={DetailsScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  tabBarPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    width: width * 0.94,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E50914',
    zIndex: -1,
    opacity: 0.9,
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '700',
  }
});
