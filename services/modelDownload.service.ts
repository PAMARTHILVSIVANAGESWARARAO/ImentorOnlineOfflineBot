import * as FileSystem from 'expo-file-system/legacy';
import { LLAMA3_2_1B_SPINQUANT } from 'react-native-executorch';
import { useChatStore } from '../store/chat.store';

export const MODEL_VERSION = 'llama3.2-1b-spinquant';
export const MODEL_FILE_NAME = 'llama3_2_1b_spinquant.pte';
export const MODEL_DIR = `${FileSystem.documentDirectory ?? ''}models/`;
export const MODEL_URI = `${MODEL_DIR}${MODEL_FILE_NAME}`;

export const TOKENIZER_FILE_NAME = 'tokenizer.json';
export const TOKENIZER_CONFIG_FILE_NAME = 'tokenizer_config.json';
export const TOKENIZER_URI = `${MODEL_DIR}${TOKENIZER_FILE_NAME}`;
export const TOKENIZER_CONFIG_URI = `${MODEL_DIR}${TOKENIZER_CONFIG_FILE_NAME}`;

type FileInfoWithSize = FileSystem.FileInfo & { size?: number };

const getRemoteModelUrl = (): string => {
  const source = LLAMA3_2_1B_SPINQUANT.modelSource;
  if (typeof source !== 'string') {
    throw new Error('Llama 3.2 1B SpinQuant model source is not a URL.');
  }
  return source;
};

const getRemoteTokenizerUrl = (): string => {
  const source = LLAMA3_2_1B_SPINQUANT.tokenizerSource;
  if (typeof source !== 'string') {
    throw new Error('Llama 3.2 1B SpinQuant tokenizer source is not a URL.');
  }
  return source;
};

const getRemoteTokenizerConfigUrl = (): string => {
  const source = LLAMA3_2_1B_SPINQUANT.tokenizerConfigSource;
  if (typeof source !== 'string') {
    throw new Error('Llama 3.2 1B SpinQuant tokenizer config source is not a URL.');
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
export const getTokenizerPath = (): string => TOKENIZER_URI;
export const getTokenizerConfigPath = (): string => TOKENIZER_CONFIG_URI;

export const getModelInfo = async (): Promise<FileInfoWithSize> =>
  FileSystem.getInfoAsync(MODEL_URI) as Promise<FileInfoWithSize>;

export const isModelDownloaded = async (): Promise<boolean> => {
  const modelInfo = await FileSystem.getInfoAsync(MODEL_URI);
  // The Llama 3.2 1b SpinQuant model file is ~1.2 GB (1,273,831,680 bytes).
  // We require it to be at least 1 GB to ensure it is complete.
  return modelInfo.exists && (modelInfo.size ?? 0) > 1000 * 1024 * 1024;
};

export const deleteModel = async (): Promise<void> => {
  const modelInfo = await FileSystem.getInfoAsync(MODEL_URI);
  if (modelInfo.exists) {
    await FileSystem.deleteAsync(MODEL_URI, { idempotent: true });
  }
  const tokenizerInfo = await FileSystem.getInfoAsync(TOKENIZER_URI);
  if (tokenizerInfo.exists) {
    await FileSystem.deleteAsync(TOKENIZER_URI, { idempotent: true });
  }
  const configInfo = await FileSystem.getInfoAsync(TOKENIZER_CONFIG_URI);
  if (configInfo.exists) {
    await FileSystem.deleteAsync(TOKENIZER_CONFIG_URI, { idempotent: true });
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
    await ensureModelDirectory();
    onProgress(0);

    // Download tokenizer config if not exists
    const tokenizerConfigInfo = await FileSystem.getInfoAsync(TOKENIZER_CONFIG_URI);
    if (!tokenizerConfigInfo.exists || (tokenizerConfigInfo.size ?? 0) === 0) {
      const tokenizerConfigDownload = FileSystem.createDownloadResumable(
        getRemoteTokenizerConfigUrl(),
        TOKENIZER_CONFIG_URI,
        {}
      );
      await tokenizerConfigDownload.downloadAsync();
    }

    // Download tokenizer if not exists
    const tokenizerInfo = await FileSystem.getInfoAsync(TOKENIZER_URI);
    if (!tokenizerInfo.exists || (tokenizerInfo.size ?? 0) === 0) {
      const tokenizerDownload = FileSystem.createDownloadResumable(
        getRemoteTokenizerUrl(),
        TOKENIZER_URI,
        {}
      );
      await tokenizerDownload.downloadAsync();
    }

    // Download model binary if not exists or incomplete (< 1 GB)
    const modelInfo = await FileSystem.getInfoAsync(MODEL_URI);
    if (!modelInfo.exists || (modelInfo.size ?? 0) < 1000 * 1024 * 1024) {
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
    } else {
      onProgress(1);
    }
    
    const success = await isModelDownloaded();
    if (!success) {
      // Clean up ONLY if model file is incomplete/corrupted
      const checkInfo = await FileSystem.getInfoAsync(MODEL_URI);
      if (checkInfo.exists && (checkInfo.size ?? 0) < 1000 * 1024 * 1024) {
        await FileSystem.deleteAsync(MODEL_URI, { idempotent: true }).catch(() => {});
      }
      useChatStore.getState().resetModelMetadata();
      return false;
    }

    const info = await getModelInfo();
    useChatStore.getState().setModelMetadata({
      modelPath: MODEL_URI,
      modelVersion: MODEL_VERSION,
      modelSize: info.size ?? 0,
      downloadedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Model download failed:', error);
    // Clean up ONLY if model file is incomplete/corrupted
    const checkInfo = await FileSystem.getInfoAsync(MODEL_URI);
    if (checkInfo.exists && (checkInfo.size ?? 0) < 1000 * 1024 * 1024) {
      await FileSystem.deleteAsync(MODEL_URI, { idempotent: true }).catch(() => {});
    }
    useChatStore.getState().resetModelMetadata();
    return false;
  }
};
