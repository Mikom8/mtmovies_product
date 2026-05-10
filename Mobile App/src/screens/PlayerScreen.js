import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
} from "react-native";
import { Video } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import { ChevronLeft } from "lucide-react-native";

const PlayerScreen = ({ route, navigation }) => {
  const { chatId, messageId, title } = route.params;
  const [loading, setLoading] = useState(true);

  // MTMovies HLS Stream URL structure
  const streamUrl = `https://mtmovies-production.up.railway.app/api/stream/hls/${chatId}/${messageId}/playlist.m3u8`;

  useEffect(() => {
    // Lock orientation to landscape for player
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

    return () => {
      // Restore to portrait when leaving
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      );
    };
  }, []);

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: streamUrl }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode="contain"
        shouldPlay
        useNativeControls
        style={styles.video}
        onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)}
        onError={(e) => console.error("Video Error:", e)}
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#E50914" />
        </View>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ChevronLeft color="#fff" size={30} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 5,
  },
});

export default PlayerScreen;
