import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "../context/AuthContext";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from "expo-constants";

const { width, height } = Dimensions.get("window");

const cfg =
  (Constants.expoConfig && Constants.expoConfig.extra) ||
  (Constants.manifest && Constants.manifest.extra) ||
  {};
const API_BASE =
  cfg.API_BASE_URL || "https://mtmoviesproduct-production.up.railway.app/api";

const LoginScreen = ({ navigation, route }) => {
  const { login, register, googleLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [mode, setMode] = useState(null); // null | 'signin' | 'signup'
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [strength, setStrength] = useState({
    width: "0%",
    color: "",
    label: "",
  });
  const emailTimer = useRef(null);
  const passwordRef = useRef(null);

  //fonts
  const [fontsLoaded] = useFonts({
    "Broche-Cut": require("../../assets/fonts/Broche-Cut.ttf"),
    Coolvetica: require("../../assets/fonts/Coolvetica-Rg.otf"),
    Code: require("../../assets/fonts/CODE-Bold.otf"),
    TT: require("../../assets/fonts/TT-Chocolates-Trial-Light.otf"),
    "TT Medium": require("../../assets/fonts/TT-Chocolates-Trial-Medium.otf"),
  });

  const checkEmail = async (val) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setMode(null);
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val }),
      });
      const data = await res.json();
      setMode(data.exists ? "signin" : "signup");
    } catch {
      setMode("signup");
    } finally {
      setChecking(false);
    }
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    setMode(null);
    clearTimeout(emailTimer.current);
    emailTimer.current = setTimeout(() => checkEmail(val), 600);
  };

  const handleEmailBlur = () => {
    clearTimeout(emailTimer.current);
    checkEmail(email);
  };

  const calcStrength = (val) => {
    let s = 0;
    if (val.length >= 6) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "#ff4444", "#ffaa00", "#4fc3f7", "#00cc66"];
    const widths = ["0%", "25%", "50%", "75%", "100%"];
    setStrength({
      width: widths[s],
      color: colors[s],
      label: s > 0 ? labels[s] : "",
    });
  };

  useEffect(() => {
    // If a navigation param `mode` is provided (signup/signin), set initial mode
    if (route?.params?.mode) {
      setMode(route.params.mode);
    }
    // clear params so returning doesn't re-trigger
    // Note: mutating route.params is okay for our simple flow
    try {
      if (route?.params) route.params.mode = undefined;
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google auth setup
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: cfg.WEB_GOOGLE_CLIENT_ID || "",
      offlineAccess: true,
    });
  }, []);

  const handleGoogleBackendLogin = async (accessToken) => {
    setLoading(true);
    try {
      const res = await googleLogin(accessToken);
      if (!res.success) {
        setError(res.error || "Google login failed");
        return;
      }

      // If there's a previous screen to go back to, go there. Otherwise go to Main.
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);

    try {
      let res;
      if (mode === "signin") {
        res = await login(email, password);
      } else {
        res = await register(email.split("@")[0], email, password);
      }

      if (!res.success) {
        setError(res.error || "Authentication failed");
        return;
      }

      // Success navigation logic:
      // If signup (first time), go to Main.
      // If signin, try to go back to where they came from.
      if (mode === "signup") {
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      }
    } catch (err) {
      setError("Cannot reach server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const btnLabel = loading
    ? mode === "signup"
      ? "Creating Account…"
      : "Signing In…"
    : mode === "signup"
      ? "Sign Up"
      : "Sign In";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={height < 800}
        showsVerticalScrollIndicator={false}
      >
        {/* Skip Button */}
        <Pressable
          style={({ pressed }) => [
            styles.skipBtn,
            pressed && { backgroundColor: "rgba(229, 9, 20, 0.2)" },
          ]}
          onPress={() => {
            if (navigation?.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation?.reset({
                index: 0,
                routes: [{ name: "Main" }],
              });
            }
          }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>

        {/* Brand */}
        <View style={styles.brandContainer}>
          <Image
            source={require("../../assets/img/unnamed-removebg-preview.png")}
            style={styles.logo}
          />
          <Text style={styles.brandText}>
            <Text style={styles.brandBold}>MT</Text>
            <Text style={styles.brandRegular}>Movies</Text>
          </Text>
        </View>

        {/* Title & Subtitle */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>
            {mode === "signup" ? "Create Account" : "Sign In"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "signup"
              ? "Join MTMovies — watch English movies in Amharic"
              : "Welcome back! Sign in to keep watching"}
          </Text>
        </View>

        {/* Email Field */}
        <View style={styles.field}>
          <View style={styles.inputWrapper}>
            <Feather
              name="mail"
              size={18}
              color="rgba(255, 255, 255, 1)"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={email}
              onChangeText={handleEmailChange}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {checking && (
              <ActivityIndicator size="small" color="rgba(255, 255, 255, 1)" />
            )}
          </View>
        </View>

        {/* Password Field */}
        <View style={styles.field}>
          <View style={styles.inputWrapper}>
            <Feather
              name="lock"
              size={18}
              color="rgba(255, 255, 255, 1)"
              style={styles.icon}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (mode === "signup") calcStrength(val);
              }}
              secureTextEntry={!showPass}
              maxLength={20}
              editable={!loading}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <Pressable
              onPress={() => setShowPass(!showPass)}
              style={({ pressed }) => [
                { padding: 4, borderRadius: 10 },
                pressed && { backgroundColor: "rgba(255,255,255,0.1)" },
              ]}
            >
              {showPass ? (
                <Feather
                  name="eye-off"
                  size={18}
                  color="rgba(255, 255, 255, 1)"
                />
              ) : (
                <Feather name="eye" size={18} color="rgba(255, 255, 255, 1)" />
              )}
            </Pressable>
          </View>

          {/* Strength bar for signup */}
          {mode === "signup" && password && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: strength.width,
                      backgroundColor: strength.color,
                    },
                  ]}
                />
              </View>
              {strength.label && (
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            loading && styles.submitBtnDisabled,
            pressed && !loading && styles.submitPressed,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{btnLabel}</Text>
          {!loading && <Feather name="chevron-right" size={18} color="#fff" />}
        </Pressable>

        {/* Forgot Password */}
        {mode === "signin" && (
          <View style={styles.forgotWrap}>
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.googleBtn,
            pressed && { backgroundColor: "rgba(255,255,255,0.15)" },
          ]}
          onPress={async () => {
            try {
              await GoogleSignin.hasPlayServices();
              const userInfo = await GoogleSignin.signIn();
              const idToken = userInfo?.data?.idToken || userInfo?.idToken;
              if (idToken) {
                await handleGoogleBackendLogin(idToken);
              } else {
                setError("Google Sign-In failed: No ID token returned");
              }
            } catch (error) {
              console.log("Google Sign-In Error:", error);
            }
          }}
          disabled={loading}
        >
          <Image
            source={require("../../assets/img/transparent-google-logo-google-logo-in-black-circle-colorful-1710875294177-removebg-preview.png")}
            style={{ width: 18, height: 18, marginRight: 8 }}
          />
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </Pressable>

        {/* Sign Up Link (when not in signup mode) */}
        {mode !== "signup" && (
          <View style={styles.signupWrap}>
            <Text style={styles.signupText}>
              Don't have an account?{" "}
              <Text
                style={styles.signupLink}
                onPress={() => {
                  setEmail("");
                  setPassword("");
                  setMode("signup");
                }}
              >
                Sign up
              </Text>
            </Text>
          </View>
        )}

        {/* Sign In Link (when in signup mode) */}
        {mode === "signup" && (
          <View style={styles.signupWrap}>
            <Text style={styles.signupText}>
              Already have an account?{" "}
              <Text
                style={styles.signupLink}
                onPress={() => {
                  setEmail("");
                  setPassword("");
                  setMode("signin");
                }}
              >
                Sign in
              </Text>
            </Text>
          </View>
        )}

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing, you agree to our{" "}
          <Text style={styles.termsLink}>Terms of Use</Text> and{" "}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>

        {/* Footer */}
        <Text style={styles.footer}>MTMovies © {new Date().getFullYear()}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000ff",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: "center",
  },
  skipBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(229, 9, 20, 0.8)",
  },
  skipText: {
    color: "#E50914",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "TT Medium",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 20,
  },
  logo: {
    width: 44,
    height: 44,
    resizeMode: "contain",
    marginBottom: 8,
  },
  brandText: {
    fontSize: 19,
    fontFamily: "Broche-Cut",
  },
  brandBold: {
    color: "#fff",
    letterSpacing: 1,
    fontFamily: "Broche-Cut",
  },
  brandRegular: {
    color: "#ff0f0fff",
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
    fontFamily: "TT Medium",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "TT Medium",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    lineHeight: 20,
  },
  field: {
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "System" : "TT Medium",
  },
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.25)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "TT Medium",
    color: "#ff6b6b",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E50914",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "rgba(229, 9, 20, 0.4)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "TT Medium",
    letterSpacing: 0.4,
  },
  forgotWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  forgotText: {
    color: "#ff6666",
    fontSize: 13,
    fontFamily: "TT",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontFamily: "TT",
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  signupWrap: {
    alignItems: "center",
    marginBottom: 15,
  },
  signupText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    fontFamily: "TT",
  },
  signupLink: {
    color: "#ff6666",
    fontFamily: "TT Medium",
  },
  googleBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "TT Medium",
    fontWeight: "600",
  },
  terms: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 5,
    lineHeight: 18,
    fontFamily: "TT",
  },
  termsLink: {
    color: "rgba(255, 77, 77, 1)",
    fontFamily: "TT",
  },
  footer: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Code",
  },
  submitPressed: {
    backgroundColor: "#B20710",
    transform: [{ scale: 0.98 }],
  },
});

export default LoginScreen;
