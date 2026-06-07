import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble } from '../components/ChatBubble';
import { ChatHeader } from '../components/ChatHeader';
import { ChatInput } from '../components/ChatInput';
import { TypingIndicator } from '../components/TypingIndicator';
import { useChat } from '../hooks/useChat';
import { useOfflineChat } from '../hooks/useOfflineChat';

export const ChatScreen = () => {
  const insets = useSafeAreaInsets();
  const offlineChat = useOfflineChat();
  const { 
    messages, 
    isStreaming, 
    isThinking, 
    streamingText, 
    sendMessage 
  } = useChat(offlineChat);

  const flatListRef = useRef<FlatList>(null);

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, streamingText]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#09090B' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View 
        style={{
          flex: 1,
          paddingTop: insets.top,
        }}
      >
        <ChatHeader />

        <View style={{ flex: 1 }}>
          {messages.length === 0 && !isStreaming && !isThinking ? (
            <View className="flex-1 justify-center px-6">
              <View className="items-center mb-8">
                <View className="w-14 h-14 bg-emerald-500/10 rounded-2xl items-center justify-center mb-4 border border-emerald-500/20">
                  <Ionicons name="chatbubble-ellipses-outline" size={26} color="#10B981" />
                </View>
                <Text className="text-white text-lg font-bold text-center">
                  How can I help you today?
                </Text>
                <Text style={{ color: '#A1A1AA' }} className="text-xs text-center mt-2">
                  Start a conversation by typing below.
                </Text>
              </View>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item._id || index.toString()}
              renderItem={({ item }) => <ChatBubble message={item} />}
              contentContainerStyle={{ paddingVertical: 10 }}
              onContentSizeChange={scrollToEnd}
              onLayout={scrollToEnd}
              ListFooterComponent={
                <>
                  {isStreaming && streamingText ? (
                    <ChatBubble 
                      message={{
                        conversationId: '',
                        role: 'assistant',
                        content: streamingText,
                        createdAt: new Date()
                      }}
                    />
                  ) : null}
                  {isThinking ? <TypingIndicator /> : null}
                </>
              }
            />
          )}
        </View>

        <ChatInput 
          onSend={sendMessage} 
          disabled={isStreaming || isThinking} 
        />
      </View>
    </KeyboardAvoidingView>
  );
};
export default ChatScreen;
