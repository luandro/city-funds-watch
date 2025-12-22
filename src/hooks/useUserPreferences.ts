import { useState, useEffect, useCallback } from "react";
import { UserPreferences } from "@/data/types";

const STORAGE_KEY = "bh-transparente-preferences";

const DEFAULT_PREFERENCES: UserPreferences = {
  neighborhood: null, // null = "Whole city"
  followedTopics: [],
};

/**
 * Custom hook for managing user preferences in local storage
 * Handles neighborhood selection and topic following
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserPreferences;
        setPreferences(parsed);
      }
    } catch (error) {
      console.warn("Failed to load preferences from localStorage:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to local storage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.warn("Failed to save preferences to localStorage:", error);
      }
    }
  }, [preferences, isLoaded]);

  // Set neighborhood selection
  const setNeighborhood = useCallback((neighborhood: string | null) => {
    setPreferences((prev) => ({
      ...prev,
      neighborhood,
    }));
  }, []);

  // Follow a topic
  const followTopic = useCallback((topic: string) => {
    setPreferences((prev) => ({
      ...prev,
      followedTopics: prev.followedTopics.includes(topic)
        ? prev.followedTopics
        : [...prev.followedTopics, topic],
    }));
  }, []);

  // Unfollow a topic
  const unfollowTopic = useCallback((topic: string) => {
    setPreferences((prev) => ({
      ...prev,
      followedTopics: prev.followedTopics.filter((t) => t !== topic),
    }));
  }, []);

  // Toggle a topic (follow if not following, unfollow if following)
  const toggleTopic = useCallback((topic: string) => {
    setPreferences((prev) => ({
      ...prev,
      followedTopics: prev.followedTopics.includes(topic)
        ? prev.followedTopics.filter((t) => t !== topic)
        : [...prev.followedTopics, topic],
    }));
  }, []);

  // Check if a topic is followed
  const isTopicFollowed = useCallback(
    (topic: string) => preferences.followedTopics.includes(topic),
    [preferences.followedTopics]
  );

  // Reset all preferences to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to remove preferences from localStorage:", error);
    }
  }, []);

  return {
    preferences,
    isLoaded,
    neighborhood: preferences.neighborhood,
    followedTopics: preferences.followedTopics,
    setNeighborhood,
    followTopic,
    unfollowTopic,
    toggleTopic,
    isTopicFollowed,
    resetPreferences,
  };
}
