import NetInfo from '@react-native-community/netinfo';
import { useChatStore } from '../store/chat.store';

export const initNetworkMonitoring = () => {
  // Check initial network status
  NetInfo.fetch().then((state) => {
    useChatStore.getState().setConnected(state.isConnected ?? false);
  });

  // Listen to network status changes
  return NetInfo.addEventListener((state) => {
    useChatStore.getState().setConnected(state.isConnected ?? false);
  });
};
