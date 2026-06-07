import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useChat } from '../hooks/useChat';
import { NetworkIndicator } from './NetworkIndicator';
import { Ionicons } from '@expo/vector-icons';

export const ChatHeader = () => {
  const { activeConversation, createNewChat } = useChat();

  return (
    <View style={styles.container}>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {activeConversation?.title || 'iMentor AI'}
        </Text>
      </View>
      <View style={styles.actions}>
        <NetworkIndicator />
        <TouchableOpacity
          onPress={() => createNewChat()}
          style={styles.newBtn}
          accessibilityLabel="Start a new chat"
        >
          <Ionicons name="add" size={18} color="#10b981" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
export default ChatHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  titleWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#e4e4e7',
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
