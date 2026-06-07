import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useChat } from '../hooks/useChat';
import { Ionicons } from '@expo/vector-icons';
import { Conversation } from '../types/chat.types';

interface ConversationListProps {
  onSelect?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({ onSelect }) => {
  const { conversations, activeConversation, selectConversation, deleteConversation, createNewChat } = useChat();

  const handleDelete = (item: Conversation) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteConversation(item._id)
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const isActive = activeConversation?._id === item._id;
    const dateFormatted = item.updatedAt
      ? new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : '';

    return (
      <View 
        className={`flex flex-row items-center justify-between mx-4 my-1 rounded-xl border ${
          isActive 
            ? 'bg-emerald-600/10 border-emerald-500/30' 
            : 'bg-zinc-900/50 border-zinc-800/40'
        }`}
      >
        <TouchableOpacity
          onPress={() => {
            selectConversation(item);
            if (onSelect) onSelect();
          }}
          className="flex-1 px-4 py-3 flex flex-col"
        >
          <Text 
            className={`text-sm font-semibold leading-tight ${isActive ? 'text-emerald-400 font-bold' : 'text-zinc-200'}`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          {dateFormatted ? (
            <Text className="text-[10px] text-zinc-500 mt-1">{dateFormatted}</Text>
          ) : null}
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          className="px-4 py-3 active:scale-95"
          accessibilityLabel={`Delete chat ${item.title}`}
        >
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-zinc-950">
      <TouchableOpacity
        onPress={() => {
          createNewChat();
          if (onSelect) onSelect();
        }}
        className="flex flex-row items-center justify-center m-4 py-2.5 bg-emerald-600 rounded-xl active:bg-emerald-700 shadow-md"
      >
        <Ionicons name="chatbox-ellipses" size={16} color="#fff" />
        <Text className="text-white text-xs font-bold ml-1.5">New Chat</Text>
      </TouchableOpacity>

      {conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 py-10">
          <Ionicons name="chatbubbles-outline" size={40} color="#27272a" />
          <Text className="text-zinc-500 text-xs mt-3 text-center">
            No previous conversations. Start a chat above!
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};
export default ConversationList;
