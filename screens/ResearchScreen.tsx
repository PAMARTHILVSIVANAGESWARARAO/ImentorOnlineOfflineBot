import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble } from '../components/ChatBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { API_BASE_URL } from '../services/api.service';
import { useChatStore } from '../store/chat.store';
import { Message } from '../types/chat.types';

interface ScrapedSource {
  url: string;
  title: string;
  method: string;
}

export const ResearchScreen = () => {
  const insets = useSafeAreaInsets();
  const { activeResearchSessionId, activeResearchTopic, setActiveResearchSession } = useChatStore();
  const [step, setStep] = useState<'setup' | 'loading' | 'chat'>('setup');
  
  // Setup state
  const [topic, setTopic] = useState('');
  const [siteCount, setSiteCount] = useState('5');
  
  // Loading timeline state
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingError, setLoadingError] = useState('');
  const timelineIntervalRef = useRef<any>(null);

  // Active Session state
  const [sessionId, setSessionId] = useState('');
  const [sources, setSources] = useState<ScrapedSource[]>([]);
  const [showSources, setShowSources] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load session from history selection
  useEffect(() => {
    if (activeResearchSessionId && activeResearchTopic) {
      setSessionId(activeResearchSessionId);
      setTopic(activeResearchTopic);
      setStep('chat');
      
      const loadSessionData = async () => {
        setIsThinking(true);
        try {
          const detailsRes = await fetch(`${API_BASE_URL}/sessions/${activeResearchSessionId}`);
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            setSources(detailsData.pages || []);
            
            if (detailsData.chats && detailsData.chats.length > 0) {
              setMessages(
                detailsData.chats.map((c: any) => ({
                  conversationId: activeResearchSessionId,
                  role: c.role,
                  content: c.content,
                  createdAt: new Date(c.timestamp),
                }))
              );
            } else {
              setMessages([
                {
                  conversationId: activeResearchSessionId,
                  role: 'assistant',
                  content: `Loaded web research session on **"${activeResearchTopic}"**.\n\nAsk me any question!`,
                  createdAt: new Date(),
                },
              ]);
            }
          }
        } catch (err) {
          console.error('Failed to load active session details:', err);
        } finally {
          setIsThinking(false);
        }
      };
      
      loadSessionData();
    }
  }, [activeResearchSessionId, activeResearchTopic]);

  const stages = [
    { title: 'Identifying authoritative websites', subtitle: 'Analyzing trusted reference domains...' },
    { title: 'Locating site maps & robots.txt', subtitle: 'Discovering structured web endpoints...' },
    { title: 'Compiling target resource URLs', subtitle: 'Downloading sitemaps and indexes...' },
    { title: 'Filtering URLs for topic relevance', subtitle: 'Using Llama model to filter matching resource links...' },
    { title: 'Scraping page contents', subtitle: 'Crawling full texts using Cheerio and Puppeteer...' },
  ];

  // Animate loading stages
  useEffect(() => {
    if (step === 'loading') {
      setLoadingStage(0);
      let currentStage = 0;
      timelineIntervalRef.current = setInterval(() => {
        if (currentStage < stages.length - 1) {
          currentStage += 1;
          setLoadingStage(currentStage);
        }
      }, 4000); // Shift every 4 seconds
    } else {
      if (timelineIntervalRef.current) {
        clearInterval(timelineIntervalRef.current);
        timelineIntervalRef.current = null;
      }
    }

    return () => {
      if (timelineIntervalRef.current) {
        clearInterval(timelineIntervalRef.current);
      }
    };
  }, [step]);

  // Scroll chat to bottom
  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  useEffect(() => {
    if (step === 'chat') {
      scrollToEnd();
    }
  }, [messages.length, step]);

  // Trigger Research Backend
  const handleStartResearch = async () => {
    if (!topic.trim()) return;
    setLoadingError('');
    setStep('loading');

    try {
      const response = await fetch(`${API_BASE_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count: parseInt(siteCount, 10) || 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Research request failed. Check server logs.');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      
      // Fetch session details to load sources
      const detailsRes = await fetch(`${API_BASE_URL}/sessions/${data.sessionId}`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setSources(detailsData.pages || []);
      }

      // Initialize chat with system intro
      setMessages([
        {
          conversationId: data.sessionId,
          role: 'assistant',
          content: `I have completed web research on **"${topic.trim()}"**.\n\nI scraped **${data.pagesScrapped || 0} pages** from top trusted educational websites (such as ${data.websites.slice(0, 3).join(', ')}).\n\nAsk me any question! I will answer using **only the scraped web context** to ensure complete accuracy.`,
          createdAt: new Date(),
        },
      ]);
      setStep('chat');
    } catch (err: any) {
      console.error('Research error:', err);
      setLoadingError(err.message || 'Connection error. Make sure backend is running.');
      setStep('setup');
    }
  };

  // Send Session Chat Message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isThinking) return;

    const userMessageContent = inputText.trim();
    setInputText('');

    const userMsg: Message = {
      conversationId: sessionId,
      role: 'user',
      content: userMessageContent,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/research/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessageContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer.');
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        conversationId: sessionId,
        role: 'assistant',
        content: data.answer,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Session chat error:', err);
      const errorMsg: Message = {
        conversationId: sessionId,
        role: 'assistant',
        content: `⚠️ Failed to get answer: ${err.message || 'Connection timeout.'}`,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
      scrollToEnd();
    }
  };

  const resetResearch = () => {
    setActiveResearchSession(null, null);
    setStep('setup');
    setTopic('');
    setSiteCount('5');
    setMessages([]);
    setSources([]);
    setShowSources(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#09090B' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        
        {/* SETUP SCREEN */}
        {step === 'setup' && (
          <ScrollView contentContainerStyle={{ padding: 24, justifyContent: 'center', flexGrow: 1 }}>
            <View className="items-center mb-6">
              <View 
                className="w-16 h-16 rounded-2xl items-center justify-center mb-4 border"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}
              >
                <Ionicons name="globe-outline" size={30} color="#10B981" />
              </View>
              <Text className="text-white text-xl font-bold text-center">AI Web Researcher</Text>
              <Text className="text-zinc-400 text-xs text-center mt-2 px-4 leading-4">
                Enter a topic to scan authority sites, extract sitemap resources, filter relevant pages, and index full contexts for accurate, private RAG chatting.
              </Text>
            </View>

            {loadingError ? (
              <View 
                className="border rounded-xl p-4 mb-4 flex-row items-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <Ionicons name="alert-circle" size={18} color="#ef4444" className="mr-3" />
                <Text className="text-red-400 text-xs flex-1">{loadingError}</Text>
              </View>
            ) : null}

            <View 
              className="border border-zinc-800 rounded-2xl p-5 mb-2"
              style={{ backgroundColor: 'rgba(24, 24, 27, 0.4)' }}
            >
              <View>
                <Text 
                  className="text-zinc-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: 10 }}
                >
                  Research Topic
                </Text>
                <TextInput
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="e.g. OOPS in Java, Quantum Computing..."
                  placeholderTextColor="#52525B"
                  className="bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3.5 mt-2 text-sm"
                />
              </View>

              <View className="mt-4">
                <Text 
                  className="text-zinc-400 font-bold uppercase tracking-wider"
                  style={{ fontSize: 10 }}
                >
                  Trusted Seed Sites Limit
                </Text>
                <View className="flex-row items-center bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-1 mt-2">
                  <TextInput
                    value={siteCount}
                    onChangeText={setSiteCount}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor="#52525B"
                    className="text-white text-sm flex-1 py-2"
                  />
                  <Ionicons name="list" size={16} color="#52525B" />
                </View>
                <Text 
                  className="text-zinc-500 mt-1.5"
                  style={{ fontSize: 9 }}
                >
                  Number of top domain authorities Groq will scan (Max 10).
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleStartResearch}
                disabled={!topic.trim()}
                activeOpacity={0.8}
                style={{ maxWidth: 260 }}
                className={`rounded-xl py-3 mt-6 flex-row items-center justify-center self-center w-full ${
                  topic.trim() ? 'bg-emerald-600' : 'bg-zinc-800'
                }`}
              >
                <Ionicons name="search" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text className="text-white font-bold text-xs">Start Scraping & Research</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* LOADING ANIMATED TIMELINE */}
        {step === 'loading' && (
          <View className="flex-1 justify-center px-8 py-10">
            <View className="items-center mb-8">
              <ActivityIndicator size="large" color="#10B981" />
              <Text className="text-white text-lg font-bold mt-4">Research Agent Active</Text>
              <Text className="text-zinc-500 text-xs mt-1 text-center">
                This process crawls real websites and can take 15-30 seconds.
              </Text>
            </View>

            <View 
              className="border border-zinc-800 rounded-2xl p-6"
              style={{ backgroundColor: 'rgba(24, 24, 27, 0.6)' }}
            >
              {stages.map((stage, idx) => {
                const isCompleted = loadingStage > idx;
                const isActive = loadingStage === idx;
                
                return (
                  <View key={idx} className="flex-row items-start my-3.5">
                    <View className="mr-4 mt-0.5">
                      {isCompleted ? (
                        <View 
                          className="w-5 h-5 rounded-full items-center justify-center border"
                          style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                        >
                          <Ionicons name="checkmark" size={12} color="#10B981" />
                        </View>
                      ) : isActive ? (
                        <ActivityIndicator size="small" color="#10B981" style={{ width: 20, height: 20 }} />
                      ) : (
                        <View className="w-5 h-5 rounded-full bg-zinc-800 items-center justify-center border border-zinc-700">
                          <Text 
                            className="text-zinc-500 font-bold"
                            style={{ fontSize: 10 }}
                          >
                            {idx + 1}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-xs font-semibold ${
                          isCompleted || isActive ? 'text-zinc-200' : 'text-zinc-600'
                        }`}
                      >
                        {stage.title}
                      </Text>
                      <Text
                        className={isActive ? 'text-emerald-500' : 'text-zinc-500'}
                        style={{ fontSize: 10, marginTop: 2 }}
                      >
                        {stage.subtitle}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* CHAT SCREEN */}
        {step === 'chat' && (
          <View className="flex-1">
            
            {/* Custom Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950">
              <TouchableOpacity onPress={resetResearch} className="p-1 mr-2 rounded-lg bg-zinc-900">
                <Ionicons name="arrow-back" size={20} color="#A1A1AA" />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-white text-xs font-bold uppercase tracking-wider text-emerald-400">Web Research Session</Text>
                <Text className="text-zinc-300 text-sm font-semibold truncate" numberOfLines={1}>
                  {topic}
                </Text>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => setShowSources(!showSources)}
                  className="flex-row items-center px-3 py-1.5 rounded-lg border"
                  style={{
                    backgroundColor: showSources ? 'rgba(16, 185, 129, 0.1)' : '#18181b',
                    borderColor: showSources ? 'rgba(16, 185, 129, 0.35)' : '#27272a',
                  }}
                >
                  <Ionicons name="globe-outline" size={14} color={showSources ? '#10B981' : '#71717A'} style={{ marginRight: 4 }} />
                  <Text 
                    className={showSources ? 'text-emerald-400' : 'text-zinc-400'}
                    style={{ fontSize: 10, fontWeight: 'bold' }}
                  >
                    Sources ({sources.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={resetResearch}
                  className="w-8 h-8 rounded-lg border items-center justify-center ml-2"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.25)',
                  }}
                  accessibilityLabel="Start a new research topic"
                >
                  <Ionicons name="add" size={18} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Collapsible Sources Panel */}
            {showSources && (
              <View 
                className="border-b border-zinc-800 px-4 py-3 max-h-48"
                style={{ backgroundColor: 'rgba(24, 24, 27, 0.9)' }}
              >
                <Text 
                  className="text-zinc-400 font-bold uppercase tracking-wider mb-2"
                  style={{ fontSize: 10 }}
                >
                  Scraped Reference Pages
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {sources.length === 0 ? (
                    <Text className="text-zinc-500 text-xs italic">No pages were successfully scraped.</Text>
                  ) : (
                    sources.map((src, idx) => (
                      <View key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mr-3 w-52 justify-between">
                        <View>
                          <Text className="text-zinc-200 text-xs font-bold truncate" numberOfLines={1}>
                            {src.title || 'Scraped Resource'}
                          </Text>
                          <Text 
                            className="text-zinc-500 truncate mt-1"
                            style={{ fontSize: 9 }}
                          >
                            {src.url}
                          </Text>
                        </View>
                        <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-zinc-900">
                          <Text 
                            className="text-zinc-500 uppercase tracking-wider font-semibold"
                            style={{ fontSize: 8 }}
                          >
                            Crawl: {src.method}
                          </Text>
                          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            {/* Chat List */}
            <View style={{ flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => <ChatBubble message={item} />}
                contentContainerStyle={{ paddingVertical: 10 }}
                onContentSizeChange={scrollToEnd}
                onLayout={scrollToEnd}
                ListFooterComponent={
                  <>{isThinking ? <TypingIndicator /> : null}</>
                }
              />
            </View>

            {/* Chat Input */}
            <View className="flex flex-row items-end px-3 py-2 bg-zinc-900 border-t border-zinc-800">
              <View 
                className="flex-1 rounded-2xl border px-3 py-1 mr-2"
                style={{
                  backgroundColor: 'rgba(39, 39, 42, 0.6)',
                  borderColor: 'rgba(63, 63, 70, 0.3)',
                }}
              >
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask about this topic using scraped pages..."
                  placeholderTextColor="#71717a"
                  multiline
                  style={{
                    color: '#FFF',
                    fontSize: 14,
                    maxHeight: 100,
                    paddingTop: Platform.OS === 'ios' ? 8 : 4,
                    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
                  }}
                  className="text-white text-sm py-1"
                />
              </View>
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isThinking}
                className={`p-2.5 rounded-full items-center justify-center ${
                  (!inputText.trim() || isThinking) ? 'bg-zinc-800' : 'bg-emerald-600'
                }`}
              >
                <Ionicons 
                  name="send" 
                  size={14} 
                  color={(!inputText.trim() || isThinking) ? '#71717a' : '#fff'} 
                />
              </TouchableOpacity>
            </View>

          </View>
        )}

      </View>
    </KeyboardAvoidingView>
  );
};

export default ResearchScreen;
