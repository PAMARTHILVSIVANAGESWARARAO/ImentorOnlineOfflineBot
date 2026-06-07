import React from 'react';
import { View, Text } from 'react-native';
import { useNetwork } from '../hooks/useNetwork';
import { useChatStore } from '../store/chat.store';

export const NetworkIndicator = () => {
  const isConnected = useNetwork();
  const syncing = useChatStore((state) => state.syncing);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isConnected ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: isConnected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
      }}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: isConnected ? '#10b981' : '#ef4444',
          marginRight: 5,
        }}
      />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: isConnected ? '#34d399' : '#f87171',
        }}
      >
        {syncing ? 'Syncing...' : isConnected ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
};
export default NetworkIndicator;
