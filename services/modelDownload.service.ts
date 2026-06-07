import * as FileSystem from 'expo-file-system/legacy';
import { LLAMA3_2_1B_SPINQUANT } from 'react-native-executorch';
import { useChatStore } from '../store/chat.store';

export const MODEL_VERSION = 'llama3.2-1b-spinquant';
export const MODEL_FILE_NAME = 'llama3_2_1b_spinquant.pte';
export const MODEL_DIR = `${FileSystem.documentDirectory ?? ''}models/`;
export const MODEL_URI = `${MODEL_DIR}${MODEL_FILE_NAME}`;

type FileInfoWithSize = FileSystem.FileInfo & { size?: number };

const getRemoteModelUrl = (): string => {
  const source = LLAMA3_2_1B_SPINQUANT.modelSource;
  if (typeof source !== 'string') {
    throw new Error('Llama 3.2 1B SpinQuant model source is not a URL.');
  }
  return source;
};

const ensureModelDirectory = async () => {
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
  }
};

export const getModelPath = (): string => MODEL_URI;

export const getModelInfo = async (): Promise<FileInfoWithSize> =>
  FileSystem.getInfoAsync(MODEL_URI) as Promise<FileInfoWithSize>;

export const isModelDownloaded = async (): Promise<boolean> => {
  const info = await getModelInfo();
  return info.exists && (info.size ?? 0) > 0;
};

export const deleteModel = async (): Promise<void> => {
  const info = await FileSystem.getInfoAsync(MODEL_URI);
  if (info.exists) {
    await FileSystem.deleteAsync(MODEL_URI, { idempotent: true });
  }
  useChatStore.getState().resetModelMetadata();
};

export const checkForModelUpdates = (): { updateAvailable: boolean; remoteVersion: string } => {
  const localVersion = useChatStore.getState().modelVersion;
  return {
    updateAvailable: Boolean(localVersion && localVersion !== MODEL_VERSION),
    remoteVersion: MODEL_VERSION,
  };
};

export const downloadModel = async (
  onProgress: (progress: number) => void
): Promise<boolean> => {
  try {
    if (await isModelDownloaded()) {
      const info = await getModelInfo();
      useChatStore.getState().setModelMetadata({
        modelPath: MODEL_URI,
        modelVersion: MODEL_VERSION,
        modelSize: info.size ?? 0,
        downloadedAt: new Date().toISOString(),
      });
      onProgress(1);
      return true;
    }

    await ensureModelDirectory();
    onProgress(0);

    const download = FileSystem.createDownloadResumable(
      getRemoteModelUrl(),
      MODEL_URI,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) {
          onProgress(Math.min(1, totalBytesWritten / totalBytesExpectedToWrite));
        }
      }
    );

    await download.downloadAsync();
    const info = await getModelInfo();
    const success = info.exists && (info.size ?? 0) > 0;

    if (!success) {
      useChatStore.getState().resetModelMetadata();
      return false;
    }

    useChatStore.getState().setModelMetadata({
      modelPath: MODEL_URI,
      modelVersion: MODEL_VERSION,
      modelSize: info.size ?? 0,
      downloadedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Model download failed:', error);
    useChatStore.getState().resetModelMetadata();
    return false;
  }
};
