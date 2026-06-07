import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useChat } from '../hooks/useChat';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { downloadModel } from '../services/modelDownload.service';

export const OnboardingScreen = () => {
  const { setOfflineModelReady, setOnboardingCompleted } = useChat();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const insets = useSafeAreaInsets();

  const handleNo = () => {
    setOfflineModelReady(false);
    setOnboardingCompleted(true);
    router.replace('/(tabs)' as any);
  };

  const handleYes = async () => {
    setIsDownloading(true);
    setStatusText('Downloading offline model files...');
    setProgress(0);

    const success = await downloadModel((nextProgress) => {
      setProgress(nextProgress);
      if (nextProgress < 1) {
        setStatusText('Downloading offline model files...');
      } else {
        setStatusText('Verifying model file...');
      }
    });

    if (success) {
      setStatusText('Offline model downloaded successfully!');
      setOfflineModelReady(true);
      setOnboardingCompleted(true);
      router.replace('/(tabs)' as any);
      return;
    }

    setStatusText('Download failed. You can skip and try again from history.');
    setOfflineModelReady(false);
    setIsDownloading(false);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        },
      ]}
    >
      {/* Header wordmark */}
      <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.wordmark}>
        <Text style={styles.wordmarkText}>I mentor</Text>
        <Text style={styles.wordmarkSub}>Offline Intelligence</Text>
      </Animated.View>

      {!isDownloading ? (
        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.card}
        >
          {/* Decorative pill */}
          <View style={styles.pill}>
            <Text style={styles.pillText}>1.2 GB · One-time setup</Text>
          </View>

          <Text style={styles.cardTitle}>Use AI{'\n'}without internet</Text>

          <Text style={styles.cardBody}>
            Download a local model once and chat privately, anytime — even with no connection.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          <TouchableOpacity
            onPress={handleYes}
            activeOpacity={0.85}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Download Offline Model</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNo}
            activeOpacity={0.7}
            style={styles.ghostBtn}
          >
            <Text style={styles.ghostBtnText}>Skip — use online only</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View
          layout={Layout.springify()}
          entering={FadeInDown.duration(500)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Setting up{'\n'}local AI</Text>

          <Text style={styles.statusText}>{statusText}</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {/* Progress details */}
          <View style={styles.progressMeta}>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            <ActivityIndicator size="small" color="#ffffff" style={{ opacity: 0.6 }} />
          </View>

          <View style={styles.divider} />

          <Text style={styles.footerNote}>
            Do not close the app. This is a one-time download.
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const GREEN_DARK = '#0d2b1a';    // background
const GREEN_MID = '#164d2e';     // card surface
const GREEN_ACCENT = '#22c55e';  // accent / progress fill
const WHITE = '#ffffff';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: GREEN_DARK,
    justifyContent: 'center',
  },
  wordmark: {
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  wordmarkText: {
    color: GREEN_ACCENT,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  wordmarkSub: {
    color: WHITE,
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.35,
    marginTop: 2,
  },
  card: {
    // backgroundColor: GREEN_MID,
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    // borderColor: 'rgba(255,255,255,0.06)',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  pill: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  pillText: {
    color: GREEN_ACCENT,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  cardTitle: {
    color: WHITE,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  cardBody: {
    color: WHITE,
    opacity: 0.55,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 24,
  },
  primaryBtn: {
    backgroundColor: GREEN_ACCENT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: GREEN_DARK,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  ghostBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ghostBtnText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  statusText: {
    color: WHITE,
    fontSize: 13,
    opacity: 0.55,
    marginBottom: 28,
    lineHeight: 20,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: GREEN_ACCENT,
    borderRadius: 100,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPct: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerNote: {
    color: WHITE,
    fontSize: 12,
    opacity: 0.35,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default OnboardingScreen;
