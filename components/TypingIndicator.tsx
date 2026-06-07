import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  withDelay
} from 'react-native-reanimated';

const Dot = ({ delay }: { delay: number }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 250 }),
          withTiming(0, { duration: 250 })
        ),
        -1,
        true
      )
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View 
      style={animatedStyle} 
      className="w-1.5 h-1.5 bg-zinc-400 rounded-full mx-0.5" 
    />
  );
};

export const TypingIndicator = () => {
  return (
    <View className="flex flex-row items-center px-4 py-3 bg-zinc-800 rounded-2xl rounded-tl-none border border-zinc-700/20 max-w-[80px] my-2 ml-4">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
};
export default TypingIndicator;
