import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Message } from '../types/chat.types';
import { Ionicons } from '@expo/vector-icons';

// Safe load of expo-clipboard to prevent startup crashes when native modules are not compiled yet
let Clipboard: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Clipboard = require('expo-clipboard');
} catch {
  console.warn('ExpoClipboard native module is not available. Please rebuild with npx expo run:android');
}

interface ChatBubbleProps {
  message: Message;
}

interface Token {
  type: 'text' | 'code-block';
  content: string;
  language?: string;
  isStreaming?: boolean;
}

const parseMarkdown = (text: string): Token[] => {
  const parts = text.split('```');
  const tokens: Token[] = [];

  for (let i = 0; i < parts.length; i++) {
    const isCode = i % 2 === 1;
    const part = parts[i];

    if (isCode) {
      const firstNewlineIndex = part.indexOf('\n');
      let language = 'code';
      let codeContent = part;

      if (firstNewlineIndex !== -1) {
        const langCandidate = part.substring(0, firstNewlineIndex).trim();
        if (langCandidate && langCandidate.length < 15 && !/\s/.test(langCandidate)) {
          language = langCandidate;
          codeContent = part.substring(firstNewlineIndex + 1);
        }
      }

      const isLastBlock = i === parts.length - 1;

      tokens.push({
        type: 'code-block',
        language: language.toLowerCase(),
        content: codeContent,
        isStreaming: isLastBlock,
      });
    } else {
      if (part) {
        tokens.push({
          type: 'text',
          content: part,
        });
      }
    }
  }

  return tokens;
};

const parseInlineMarkdown = (text: string) => {
  const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(inlineRegex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <Text key={index} style={{ fontWeight: 'bold', color: '#ffffff' }}>
          {boldText}
        </Text>
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      const codeText = part.slice(1, -1);
      return (
        <Text
          key={index}
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.08)' : undefined,
            color: '#34d399',
            paddingHorizontal: Platform.OS === 'ios' ? 4 : undefined,
            borderRadius: Platform.OS === 'ios' ? 4 : undefined,
            fontSize: 13,
            fontWeight: 'bold',
          }}
        >
          {codeText}
        </Text>
      );
    } else {
      return <Text key={index}>{part}</Text>;
    }
  });
};

const renderFormattedText = (text: string) => {
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    const bulletMatch = line.match(/^(\s*)(-\s|\*\s|\+\s)(.*)/);
    const numberedMatch = line.match(/^(\s*)(\d+\.\s)(.*)/);

    let isListItem = false;
    let listPrefix = '';
    let lineContent = line;
    let indentLevel = 0;

    if (bulletMatch) {
      isListItem = true;
      listPrefix = '• ';
      lineContent = bulletMatch[3];
      indentLevel = bulletMatch[1].length;
    } else if (numberedMatch) {
      isListItem = true;
      listPrefix = numberedMatch[2];
      lineContent = numberedMatch[3];
      indentLevel = numberedMatch[1].length;
    }

    const parsedLine = parseInlineMarkdown(lineContent);

    if (isListItem) {
      return (
        <View
          key={lineIndex}
          style={{
            flexDirection: 'row',
            marginLeft: indentLevel * 10 + 12,
            marginTop: 3,
            marginBottom: 3,
            alignItems: 'flex-start',
          }}
        >
          <Text className="text-emerald-500 font-bold text-sm mr-2">{listPrefix}</Text>
          <Text style={{ flex: 1 }} className="text-zinc-100 text-sm leading-5">
            {parsedLine}
          </Text>
        </View>
      );
    }

    if (line.trim() === '') {
      return <View key={lineIndex} style={{ height: 6 }} />;
    }

    return (
      <Text key={lineIndex} className="text-zinc-100 text-sm leading-5 mt-1 mb-1">
        {parsedLine}
      </Text>
    );
  });
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (Clipboard && Clipboard.setStringAsync) {
      try {
        await Clipboard.setStringAsync(code);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        Alert.alert('Copy failed', 'Could not copy to clipboard.');
      }
    } else {
      Alert.alert(
        'Clipboard Not Available',
        'The clipboard native module is not loaded yet. Please rebuild your app to enable copying:\n\nnpx expo run:android'
      );
    }
  };

  return (
    <View className="my-2.5 rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950">
      {/* Header */}
      <View className="flex-row items-center justify-between bg-zinc-900/90 px-4 py-2 border-b border-zinc-800/60">
        <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          {language}
        </Text>
        <TouchableOpacity
          onPress={handleCopy}
          activeOpacity={0.7}
          className="flex-row items-center px-2 py-1 rounded-md active:bg-zinc-800"
        >
          <Ionicons
            name={copied ? "checkmark-sharp" : "copy-outline"}
            size={13}
            color={copied ? "#10b981" : "#a1a1aa"}
          />
          <Text className={`text-[11px] font-bold ml-1.5 ${copied ? 'text-emerald-500' : 'text-zinc-400'}`}>
            {copied ? 'Copied!' : 'Copy code'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Code Content */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{ padding: 14 }}
      >
        <Text
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
            color: '#e4e4e7',
            fontSize: 12.5,
            lineHeight: 18,
          }}
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
};

const renderMessageContent = (content: string) => {
  const tokens = parseMarkdown(content);
  return tokens.map((token, index) => {
    if (token.type === 'code-block') {
      return (
        <CodeBlock
          key={index}
          code={token.content}
          language={token.language || 'code'}
        />
      );
    } else {
      const cleanText = token.content.replace(/^\n+|\n+$/g, '');
      if (!cleanText) return null;
      return (
        <View key={index} className="my-0.5">
          {renderFormattedText(cleanText)}
        </View>
      );
    }
  });
};

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
        className={`rounded-2xl px-4 py-2.5 shadow-sm ${
          isUser
            ? 'bg-emerald-600 rounded-tr-none max-w-[85%]'
            : 'bg-zinc-800/95 rounded-tl-none border border-zinc-700/30 w-full max-w-full'
        }`}
      >
        {isUser ? (
          <Text className="text-sm leading-5 text-white">
            {message.content}
          </Text>
        ) : (
          <View className="flex-col">
            {renderMessageContent(message.content)}
          </View>
        )}
        {formattedTime ? (
          <Text
            className={`text-[9px] mt-1.5 text-right ${
              isUser ? 'text-emerald-100/80' : 'text-zinc-500'
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
