import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Octicons from '@expo/vector-icons/Octicons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionicons from '@expo/vector-icons/Ionicons';
import HomeScreen from "../screens/HomeScreen";
import DetailsScreen from "../screens/DetailsScreen";
import PlayerScreen from "../screens/PlayerScreen";
import LoginScreen from "../screens/LoginScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MyListScreen from "../screens/MyListScreen";
import SearchScreen from "../screens/SearchScreen";
import DownloadsScreen from "../screens/DownloadsScreen";
import PlanScreen from "../screens/PlanScreen";
import SubscriptionDetailsScreen from "../screens/SubscriptionDetailsScreen";
import PersonalInfoScreen from "../screens/PersonalInfoScreen";
import { useAuth } from "../context/AuthContext";
import { useFonts } from "expo-font";
import { View, ActivityIndicator, StyleSheet, Pressable, Text, Dimensions, Animated } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path, Defs, LinearGradient as SvgGradient, Rect, Stop, ClipPath } from 'react-native-svg';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const tabWidth = (width * 0.94 - 20) / state.routes.length; // Calculate based on pill width and padding
  const translateX = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf")
  });

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [state.index, tabWidth]);

  return (
    <View>
      {/* Cinematic Bottom Shadow */}
      <View style={styles.shadowGradientWrapper}>
        <Svg height="100" width={width}>
          <Defs>
            <SvgGradient id="bottomShadow" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0" stopColor="#000" stopOpacity="1" />
              <Stop offset="0.5" stopColor="#000" stopOpacity="0.4" />
              <Stop offset="1" stopColor="#000" stopOpacity="0" />
            </SvgGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#bottomShadow)" />
        </Svg>
      </View>

      <View style={[styles.tabBarContainer, { bottom: insets.bottom + 10 }]}>
        <View style={styles.tabBarPill}>
          {/* Sliding Indicator */}
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                width: tabWidth - 2,
                paddingHorizontal: 35,
                transform: [{ translateX: translateX }]
              }
            ]}
          />

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
      name="MyList"
      component={MyListScreen}
      options={{
        tabBarLabel: "My Activity",
        tabBarIcon: ({ color, size, focused }) =>
          focused ? (
            <Svg width={size + 2} height={size + 2} viewBox="0 0 24 24" fill="none">
              <G clipPath="url(#clip0_4418_8741)">
                <Path d="M16.8201 2H7.18007C5.05007 2 3.32007 3.74 3.32007 5.86V19.95C3.32007 21.75 4.61007 22.51 6.19007 21.64L11.0701 18.93C11.5901 18.64 12.4301 18.64 12.9401 18.93L17.8201 21.64C19.4001 22.52 20.6901 21.76 20.6901 19.95V5.86C20.6801 3.74 18.9501 2 16.8201 2ZM15.0101 9.75C14.0401 10.1 13.0201 10.28 12.0001 10.28C10.9801 10.28 9.96007 10.1 8.99007 9.75C8.60007 9.61 8.40007 9.18 8.54007 8.79C8.69007 8.4 9.12007 8.2 9.51007 8.34C11.1201 8.92 12.8901 8.92 14.5001 8.34C14.8901 8.2 15.3201 8.4 15.4601 8.79C15.6001 9.18 15.4001 9.61 15.0101 9.75Z" fill={color} />
              </G>
              <Defs>
                <ClipPath id="clip0_4418_8741">
                  <Rect width="24" height="24" fill="white" />
                </ClipPath>
              </Defs>
            </Svg>
          ) : (
            <Svg width={size + 2} height={size + 2} viewBox="0 0 24 24" fill="none">
              <G clipPath="url(#clip0_4418_7519)">
                <Path d="M12 10.2796C10.98 10.2796 9.96 10.0996 8.99 9.74956C8.6 9.60956 8.4 9.17956 8.54 8.78956C8.69 8.39956 9.12 8.19956 9.51 8.33956C11.12 8.91956 12.89 8.91956 14.5 8.33956C14.89 8.19956 15.32 8.39956 15.46 8.78956C15.6 9.17956 15.4 9.60956 15.01 9.74956C14.04 10.0996 13.02 10.2796 12 10.2796Z" fill={color} />
                <Path d="M19.0701 22.75C18.5601 22.75 18.0001 22.6 17.4601 22.29L12.5801 19.58C12.2901 19.42 11.7201 19.42 11.4301 19.58L6.55007 22.29C5.56007 22.84 4.55007 22.9 3.78007 22.44C3.01007 21.99 2.57007 21.08 2.57007 19.95V5.86C2.57007 3.32 4.64007 1.25 7.18007 1.25H16.8301C19.3701 1.25 21.4401 3.32 21.4401 5.86V19.95C21.4401 21.08 21.0001 21.99 20.2301 22.44C19.8801 22.65 19.4801 22.75 19.0701 22.75ZM12.0001 17.96C12.4701 17.96 12.9301 18.06 13.3001 18.27L18.1801 20.98C18.6901 21.27 19.1601 21.33 19.4601 21.15C19.7601 20.97 19.9301 20.54 19.9301 19.95V5.86C19.9301 4.15 18.5301 2.75 16.8201 2.75H7.18007C5.47007 2.75 4.07007 4.15 4.07007 5.86V19.95C4.07007 20.54 4.24007 20.98 4.54007 21.15C4.84007 21.32 5.30007 21.27 5.82007 20.98L10.7001 18.27C11.0701 18.06 11.5301 17.96 12.0001 17.96Z" fill={color} />
              </G>
              <Defs>
                <ClipPath id="clip0_4418_7519">
                  <Rect width="24" height="24" fill="white" />
                </ClipPath>
              </Defs>
            </Svg>
          ),
      }}
    />
    <Tab.Screen
      name="Search"
      component={SearchScreen}
      options={{
        tabBarLabel: "Search",
        tabBarIcon: ({ color, size, focused }) => (focused ? <Ionicons name="search-circle-sharp" size={size + 5} color={color} /> : <Feather name="search" color={color} size={size} />),
      }}
    />
    <Tab.Screen
      name="Downloads"
      component={DownloadsScreen}
      options={{
        tabBarLabel: "Downloads",
        tabBarIcon: ({ color, size, focused }) =>
          focused ? (
            <Svg width={size + 2} height={size + 2} viewBox="0 0 24 24" fill="none">
              <Path d="M16.8 9H12.75V13.44L14.82 11.37C14.97 11.22 15.16 11.15 15.35 11.15C15.54 11.15 15.73 11.22 15.88 11.37C16.17 11.66 16.17 12.14 15.88 12.43L12.53 15.78C12.24 16.07 11.76 16.07 11.47 15.78L8.12 12.43C7.83 12.14 7.83 11.66 8.12 11.37C8.41 11.08 8.89 11.08 9.18 11.37L11.25 13.44V9H7.2C4 9 2 11 2 14.2V16.79C2 20 4 22 7.2 22H16.79C19.99 22 21.99 20 21.99 16.8V14.2C22 11 20 9 16.8 9Z" fill={color} />
              <Path d="M12.75 2.75C12.75 2.34 12.41 2 12 2C11.59 2 11.25 2.34 11.25 2.75V9H12.75V2.75Z" fill={color} />
            </Svg>
          ) : (
            <Svg width={size + 2} height={size + 2} viewBox="0 0 24 24" fill="none">
              <Path d="M15.26 22.2503H8.73998C3.82998 22.2503 1.72998 20.1503 1.72998 15.2403V15.1103C1.72998 10.6703 3.47998 8.53027 7.39998 8.16027C7.79998 8.13027 8.17998 8.43027 8.21998 8.84027C8.25998 9.25027 7.95998 9.62027 7.53998 9.66027C4.39998 9.95027 3.22998 11.4303 3.22998 15.1203V15.2503C3.22998 19.3203 4.66998 20.7603 8.73998 20.7603H15.26C19.33 20.7603 20.77 19.3203 20.77 15.2503V15.1203C20.77 11.4103 19.58 9.93027 16.38 9.66027C15.97 9.62027 15.66 9.26027 15.7 8.85027C15.74 8.44027 16.09 8.13027 16.51 8.17027C20.49 8.51027 22.27 10.6603 22.27 15.1303V15.2603C22.27 20.1503 20.17 22.2503 15.26 22.2503Z" fill={color} />
              <Path d="M12 15.63C11.59 15.63 11.25 15.29 11.25 14.88V2C11.25 1.59 11.59 1.25 12 1.25C12.41 1.25 12.75 1.59 12.75 2V14.88C12.75 15.3 12.41 15.63 12 15.63Z" fill={color} />
              <Path d="M12.0001 16.7498C11.8101 16.7498 11.6201 16.6798 11.4701 16.5298L8.12009 13.1798C7.83009 12.8898 7.83009 12.4098 8.12009 12.1198C8.41009 11.8298 8.89009 11.8298 9.18009 12.1198L12.0001 14.9398L14.8201 12.1198C15.1101 11.8298 15.5901 11.8298 15.8801 12.1198C16.1701 12.4098 16.1701 12.8898 15.8801 13.1798L12.5301 16.5298C12.3801 16.6798 12.1901 16.7498 12.0001 16.7498Z" fill={color} />
            </Svg>
          ),
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
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="MyList" component={MyListScreen} />
      <Stack.Screen name="Plan" component={PlanScreen} />
      <Stack.Screen name="SubscriptionDetails" component={SubscriptionDetailsScreen} />
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
    zIndex: 1000,
  },
  shadowGradientWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  tabBarPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 20, 0.92)',
    width: width * 0.94,
    height: 58,
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
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E50914',
    zIndex: 0,
    left: 5, // Account for pill padding
  },
  tabLabel: {
    fontSize: 8.2,
    marginTop: 4,
    fontFamily: 'Code'
  }
});
