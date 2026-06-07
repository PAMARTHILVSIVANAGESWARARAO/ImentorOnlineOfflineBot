import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Message } from '../types/chat.types';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  const formattedTime = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)}
      className={`flex flex-row my-2 px-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <View 
        className={`max-w-[100%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isUser 
            ? 'bg-emerald-600 rounded-tr-none' 
            : 'bg-zinc-800 rounded-tl-none border border-zinc-700/20'
        }`}
      >
        <Text className={`text-sm leading-5 ${isUser ? 'text-white' : 'text-zinc-100'}`}>
          {message.content}
        </Text>
        {formattedTime ? (
          <Text 
            className={`text-[9px] mt-1 text-right ${
              isUser ? 'text-emerald-100/80' : 'text-zinc-400/80'
            }`}
          >
            {formattedTime}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
};
export default ChatBubble;
