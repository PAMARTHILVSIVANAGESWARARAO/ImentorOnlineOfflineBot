import { useChatStore } from '../store/chat.store';

export const useNetwork = () => {
  return useChatStore((state) => state.isConnected);
};
export default useNetwork;
