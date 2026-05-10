import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Play, Info, Plus } from "lucide-react-native";
import client from "../api/client";

const DetailsScreen = ({ route, navigation }) => {
  const { id, type } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const endpoint = type === "series" ? `/series/${id}` : `/movies/${id}`;
      const response = await client.get(endpoint);
      setData(type === "series" ? response.data.series : response.data.movie);
    } catch (error) {
      console.error("Failed to fetch details", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const handleWatch = () => {
    if (type === "movie") {
      navigation.navigate("Player", {
        title: data.title,
        chatId: data.telegram?.chatId,
        messageId: data.telegram?.messageId,
      });
    } else {
      // For series, usually pick first episode or show selector
      const firstEp = data.seasons?.[0]?.episodes?.[0];
      if (firstEp) {
        navigation.navigate("Player", {
          title: `${data.title} - ${firstEp.title}`,
          chatId: firstEp.telegramChatId,
          messageId: firstEp.telegramMessageId,
        });
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: data.backdrop || data.poster }}
        style={styles.backdrop}
      />

      <View style={styles.content}>
        <Text style={styles.title}>{data.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{data.year}</Text>
          <Text style={styles.metaText}>{data.quality}</Text>
          <Text style={styles.metaText}>{data.rating}★</Text>
        </View>

        <TouchableOpacity style={styles.playButton} onPress={handleWatch}>
          <Play fill="#000" size={20} color="#000" />
          <Text style={styles.playButtonText}>Watch Now</Text>
        </TouchableOpacity>

        <Text style={styles.description}>{data.description}</Text>

        <View style={styles.genres}>
          {data.genres?.map((genre, index) => (
            <View key={index} style={styles.genreTag}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>

        {type === "series" &&
          data.seasons?.map((season) => (
            <View key={season.seasonNumber} style={styles.seasonContainer}>
              <Text style={styles.seasonTitle}>
                Season {season.seasonNumber}
              </Text>
              {season.episodes.map((ep) => (
                <TouchableOpacity
                  key={ep.episodeNumber}
                  style={styles.episodeItem}
                  onPress={() =>
                    navigation.navigate("Player", {
                      title: `${data.title} - ${ep.title}`,
                      chatId: ep.telegramChatId,
                      messageId: ep.telegramMessageId,
                    })
                  }
                >
                  <Text style={styles.episodeText}>
                    E{ep.episodeNumber}: {ep.title}
                  </Text>
                  <Play size={16} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: { width: "100%", height: 250 },
  content: { padding: 20 },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 10 },
  meta: { flexDirection: "row", marginBottom: 20 },
  metaText: { color: "#aaa", marginRight: 15, fontSize: 14 },
  playButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  playButtonText: {
    color: "#000",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 16,
  },
  description: {
    color: "#ccc",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  genres: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  genreTag: {
    backgroundColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: { color: "#eee", fontSize: 12 },
  seasonContainer: { marginTop: 20 },
  seasonTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  episodeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  episodeText: { color: "#ccc", fontSize: 14 },
});

export default DetailsScreen;
