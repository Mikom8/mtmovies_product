import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useMovies } from "../context/MovieContext";
import { useNavigation } from "@react-navigation/native";

const HomeScreen = () => {
  const { movies, series, featuredItems, loading, error } = useMovies();
  const navigation = useNavigation();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  const renderContentItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("Details", {
          id: item._id,
          type: item.seasons ? "series" : "movie",
        })
      }
    >
      <Image source={{ uri: item.poster }} style={styles.poster} />
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {featuredItems.length > 0 && (
        <TouchableOpacity
          style={styles.hero}
          onPress={() =>
            navigation.navigate("Details", {
              id: featuredItems[0]._id,
              type: featuredItems[0].seasons ? "series" : "movie",
            })
          }
        >
          <Image
            source={{
              uri: featuredItems[0].backdrop || featuredItems[0].poster,
            }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{featuredItems[0].title}</Text>
            <Text style={styles.heroSubtitle}>
              {featuredItems[0].genres?.join(" • ")}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Trending Movies</Text>
      <FlatList
        horizontal
        data={movies}
        renderItem={renderContentItem}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />

      <Text style={styles.sectionTitle}>Popular Series</Text>
      <FlatList
        horizontal
        data={series}
        renderItem={renderContentItem}
        keyExtractor={(item) => item._id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
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
  hero: { width: "100%", height: 400, marginBottom: 20 },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  heroSubtitle: { color: "#ccc", fontSize: 14, marginTop: 5 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    marginBottom: 10,
  },
  list: { paddingLeft: 15 },
  card: { width: 120, marginRight: 8, marginBottom: 20 },
  poster: { width: 120, height: 180, borderRadius: 8 },
  title: { color: "#fff", fontSize: 12, marginTop: 5, textAlign: "center" },
});

export default HomeScreen;
