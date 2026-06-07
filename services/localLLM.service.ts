import { LLAMA3_2_1B_SPINQUANT, LLMModule } from 'react-native-executorch';
import { MODEL_VERSION, getModelPath, isModelDownloaded } from './modelDownload.service';

export interface LocalLLMStatus {
  isDownloaded: boolean;
  modelPath: string;
  modelVersion: string;
}

let moduleInstance: LLMModule | null = null;
let currentTokenCallback: ((token: string) => void) | undefined;

const getLocalModelConfig = () => ({
  ...LLAMA3_2_1B_SPINQUANT,
  modelSource: getModelPath(),
});

export const localLLMService = {
  async loadModel(onToken?: (token: string) => void): Promise<LocalLLMStatus> {
    const isDownloaded = await isModelDownloaded();

    if (!isDownloaded) {
      throw new Error('Offline model file is not downloaded.');
    }

    if (moduleInstance && onToken && onToken !== currentTokenCallback) {
      currentTokenCallback = onToken;
      moduleInstance.setTokenCallback({ tokenCallback: onToken });
    }

    if (!moduleInstance) {
      currentTokenCallback = onToken;
      moduleInstance = await LLMModule.fromModelName(
        getLocalModelConfig(),
        undefined,
        onToken
      );
    }

    return {
      isDownloaded,
      modelPath: getModelPath(),
      modelVersion: MODEL_VERSION,
    };
  },

  unloadModel(): void {
    if (moduleInstance) {
      moduleInstance.delete();
      moduleInstance = null;
      currentTokenCallback = undefined;
    }
  },

  isModelLoaded(): boolean {
    return moduleInstance !== null;
  },

  async generate(content: string): Promise<string> {
    await this.loadModel();
    const history = await moduleInstance!.sendMessage(content);
    const assistantMessage = [...history].reverse().find((message) => message.role === 'assistant');
    return assistantMessage?.content ?? '';
  },

  async streamGenerate(content: string, onToken: (token: string) => void): Promise<string> {
    await this.loadModel(onToken);
    const history = await moduleInstance!.sendMessage(content);
    const assistantMessage = [...history].reverse().find((message) => message.role === 'assistant');
    return assistantMessage?.content ?? '';
  },
};

export default localLLMService;
