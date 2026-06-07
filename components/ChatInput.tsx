import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(38);
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
    setInputHeight(38);
  };

  return (
    <View className="flex flex-row items-end px-3 py-2 bg-zinc-900 border-t border-zinc-850">
      <View className="flex-1 bg-zinc-800/60 rounded-2xl border border-zinc-700/30 px-3 py-1 mr-2">
        <TextInput
          ref={inputRef}
          className="text-white text-sm max-h-24 py-1"
          placeholder="Message Groq Chatbot..."
          placeholderTextColor="#71717a"
          multiline
          value={text}
          onChangeText={setText}
          onContentSizeChange={(event) => {
            const height = event.nativeEvent.contentSize.height;
            setInputHeight(Math.max(38, height));
          }}
          style={{ height: Math.min(100, inputHeight) }}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
        />
      </View>
      <TouchableOpacity
        onPress={handleSend}
        disabled={!text.trim() || disabled}
        className={`p-2.5 rounded-full items-center justify-center ${
          (!text.trim() || disabled) ? 'bg-zinc-800' : 'bg-emerald-600'
        }`}
      >
        <Ionicons 
          name="send" 
          size={14} 
          color={(!text.trim() || disabled) ? '#71717a' : '#fff'} 
        />
      </TouchableOpacity>
    </View>
  );
};
export default ChatInput;
