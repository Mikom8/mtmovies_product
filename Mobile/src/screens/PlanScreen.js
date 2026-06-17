import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";

// Payment info as requested
const PAYMENT_INFO = {
  method: "Telebirr",
  number: "0919516418",
  name: "BIKILA MELESE",
};

const PLANS = [
  {
    name: "Basic",
    price: 150,
    features: [
      { text: "HD quality (720p)", ok: true },
      { text: "1 screen at a time", ok: true },
      { text: "Amharic subtitles", ok: true },
      { text: "Amharic dub", ok: true },
      { text: "Download offline", ok: false },
    ],
  },
  {
    name: "Popular",
    price: 250,
    featured: true,
    features: [
      { text: "Full HD (1080p)", ok: true },
      { text: "2 screens at once", ok: true },
      { text: "Amharic subtitles", ok: true },
      { text: "Amharic dub", ok: true },
      { text: "Download offline", ok: true },
    ],
  },
  {
    name: "Family",
    price: 350,
    features: [
      { text: "4K Ultra HD", ok: true },
      { text: "5 screens at once", ok: true },
      { text: "Amharic subtitles", ok: true },
      { text: "Amharic dub", ok: true },
      { text: "Download offline", ok: true },
    ],
  },
];

const PlanScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1); // 1: Choose, 2: Pay, 3: Verify
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputError, setInputError] = useState(false);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep(2);
  };

  const handleIPaid = () => {
    setStep(3);
  };

  const handleSubmitTransaction = async () => {
    if (!transactionId.trim()) {
      setInputError(true);
      setError("Transaction ID is required");
      return;
    }
    setInputError(false);
    setError("");
    setLoading(true);

    try {
      const transactionIdValue = transactionId.trim().toUpperCase();

      const res = await client.post("/payments/submit", {
        transactionId: transactionIdValue,
        expectedAmount: selectedPlan.price,
        planName: selectedPlan.name,
      });

      setLoading(false);
      
      // Payment submitted successfully - now pending admin verification
      Alert.alert(
        "✅ Payment Submitted",
        "Your payment has been submitted for verification. We'll activate your plan within a few hours once our admin verifies it.",
        [{ text: "OK", onPress: () => navigation.navigate("Main") }]
      );
    } catch (err) {
      setLoading(false);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || "Failed to submit payment. Please try again.";
      setError(errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Upgrade Plan</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTag}>Step 1 of 2</Text>
              <Text style={styles.title}>Choose Your Plan</Text>
              <Text style={styles.subtitle}>
                No commitments, cancel anytime.
              </Text>

              {PLANS.map((plan, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.planCard,
                    plan.featured && styles.planCardFeatured,
                  ]}
                >
                  {plan.featured && (
                    <View style={styles.bestValueBadge}>
                      <Feather
                        name="star"
                        size={12}
                        color="#000"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.bestValueText}>Best Value</Text>
                    </View>
                  )}
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.currency}>ETB</Text>
                    <Text style={styles.priceAmount}>{plan.price}</Text>
                    <Text style={styles.pricePeriod}>/mo</Text>
                  </View>

                  <View style={styles.featuresList}>
                    {plan.features.map((f, i) => (
                      <View
                        key={i}
                        style={[styles.featureRow, !f.ok && { opacity: 0.4 }]}
                      >
                        {f.ok ? (
                          <Feather
                            name="check"
                            size={16}
                            color="#00cc66"
                            style={styles.featureIcon}
                          />
                        ) : (
                          <Feather
                            name="x"
                            size={16}
                            color="#ff4444"
                            style={styles.featureIcon}
                          />
                        )}
                        <Text
                          style={[
                            styles.featureText,
                            !f.ok && { textDecorationLine: "line-through" },
                          ]}
                        >
                          {f.text}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.selectBtn,
                      plan.featured && styles.selectBtnFeatured,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => handleSelectPlan(plan)}
                  >
                    <Text
                      style={[
                        styles.selectBtnText,
                        plan.featured && styles.selectBtnTextFeatured,
                      ]}
                    >
                      {plan.featured ? "Subscribe Now" : "Get Started"}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTag}>Step 2 of 2</Text>
              <Text style={styles.title}>Complete Payment</Text>
              <Text style={styles.subtitle}>
                You selected the{" "}
                <Text style={{ color: "#fff", fontFamily: "TT Medium" }}>
                  {selectedPlan?.name}
                </Text>{" "}
                Plan (ETB {selectedPlan?.price}/mo)
              </Text>

              <View style={styles.paymentCard}>
                <Text style={styles.paymentLogo}>telebirr</Text>

                <View style={styles.instructionStep}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>1</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Open your Telebirr app or dial *127#
                  </Text>
                </View>
                <View style={styles.instructionStep}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>2</Text>
                  </View>
                  <Text style={styles.instructionText}>
                    Send exactly{" "}
                    <Text style={{ color: "#fff", fontFamily: "TT Medium" }}>
                      ETB {selectedPlan?.price}
                    </Text>{" "}
                    to:
                  </Text>
                </View>

                <View style={styles.accountBox}>
                  <Text style={styles.accountNumber} selectable={true}>
                    {PAYMENT_INFO.number}
                  </Text>
                  <Text style={styles.accountName}>{PAYMENT_INFO.name}</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.paidBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={handleIPaid}
                >
                  <Text style={styles.paidBtnText}>I Paid</Text>
                </Pressable>

                <Pressable
                  style={styles.changePlanBtn}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.changePlanText}>Change Plan</Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.title}>Submit Payment</Text>
              <Text style={styles.subtitle}>
                Enter your Telebirr transaction ID. Our admin will verify it and activate your plan within a few hours.
              </Text>

              <View style={styles.paymentCard}>
                <Text style={styles.label}>Transaction ID</Text>
                <TextInput
                  style={[styles.input, inputError && styles.inputError]}
                  placeholder="e.g. 7A1B2C3D4E"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={transactionId}
                  onChangeText={(val) => {
                    setTransactionId(val);
                    if (inputError && val.trim().length > 0) {
                      setInputError(false);
                      setError("");
                    }
                  }}
                  autoCapitalize="characters"
                  editable={!loading}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.paidBtn,
                    loading && { opacity: 0.6 },
                    pressed && !loading && { opacity: 0.8 },
                  ]}
                  onPress={handleSubmitTransaction}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.paidBtnText}>Submit Transaction</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.changePlanBtn}
                  onPress={() => setStep(2)}
                  disabled={loading}
                >
                  <Text style={styles.changePlanText}>Back</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "TT Medium",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    alignItems: "center",
  },
  stepTag: {
    color: "#E50914",
    fontSize: 13,
    fontFamily: "Code",
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Coolvetica",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontFamily: "TT",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  planCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  planCardFeatured: {
    borderColor: "#E50914",
    backgroundColor: "rgba(229,9,20,0.05)",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    backgroundColor: "#E50914",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bestValueText: {
    color: "#000",
    fontSize: 12,
    fontFamily: "Code",
  },
  planName: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "TT Medium",
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  currency: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontFamily: "TT",
    marginBottom: 4,
    marginRight: 4,
  },
  priceAmount: {
    color: "#fff",
    fontSize: 36,
    fontFamily: "Code",
    lineHeight: 40,
  },
  pricePeriod: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontFamily: "TT",
    marginBottom: 4,
    marginLeft: 2,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontFamily: "TT",
  },
  selectBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  selectBtnFeatured: {
    backgroundColor: "#E50914",
  },
  selectBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "TT Medium",
  },
  selectBtnTextFeatured: {
    color: "#fff",
    fontFamily: "TT Medium",
  },
  paymentCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  paymentLogo: {
    color: "#1a75ff",
    fontSize: 24,
    fontFamily: "Code",
    textAlign: "center",
    marginBottom: 20,
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: -2,
  },
  stepNumText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "TT Medium",
  },
  instructionText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontFamily: "TT",
    flex: 1,
  },
  accountBox: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginVertical: 20,
  },
  accountNumber: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Code",
    letterSpacing: 2,
    marginBottom: 4,
  },
  accountName: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "TT",
    letterSpacing: 1,
  },
  paidBtn: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  paidBtnText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "TT Medium",
  },
  changePlanBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  changePlanText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontFamily: "TT",
    textDecorationLine: "underline",
  },
  label: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontFamily: "TT",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    color: "#fff",
    fontSize: 16,
    fontFamily: "TT",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#ff4444",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 13,
    fontFamily: "TT",
    marginBottom: 16,
  },
});

export default PlanScreen;
