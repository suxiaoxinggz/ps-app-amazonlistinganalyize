export interface ProviderConfig {
  url: string;
  models: string[];
}

export const DEFAULT_BACKEND_URL = '';
export const TENCENT_TOKEN_PLAN_URL = 'https://api.lkeap.cloud.tencent.com/plan/v3';

const tencentTokenHubModels = [
  'hy4-preview',
  'hy3',
  'deepseek/deepseek-flash',
  'deepseek/deepseek-v4-flash-0731',
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-pro-0813',
  'deepseek-v4-flash',
  'glm-5.3',
  'glm-5.3-flash',
  'glm-5.3-flashx',
  'glm-5.2',
  'kimi-k2.7-code',
  'kimi-k2.8-preview',
  'kimi-k3',
  'minimax-m3',
  'qwen3.5-flash',
  'mimo-v2.6-pro',
  'mimo-v2.6-flash',
];

export const PROVIDERS: Record<string, ProviderConfig> = {
  OpenAI: {
    url: 'https://api.openai.com/v1',
    models: ['gpt-5-nano', 'gpt-5-mini', 'gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
  },
  DeepSeek: {
    url: 'https://api.deepseek.com',
    models: ['deepseek-flash', 'deepseek-v4-pro'],
  },
  OpenRouter: {
    url: 'https://openrouter.ai/api/v1',
    models: [
      'openai/gpt-5-nano',
      'openai/gpt-5-mini',
      'openai/gpt-4o-mini',
      'openai/gpt-4.1-mini',
      'anthropic/claude-sonnet-4.6',
      'google/gemini-3.8-flash',
      'google/gemini-3.5-flash-lite',
      'google/gemini-3.1-pro-preview',
      'qwen/qwen3.8-flash',
      'qwen/qwen3.8-27b',
      'z-ai/glm-5.3-flash',
      'z-ai/glm-5.3-flashx',
      'z-ai/glm-5.3',
      '~z-ai/glm-flash-latest',
      'moonshotai/kimi-k3',
      'moonshotai/kimi-k2.7-code',
      'minimax/minimax-m3',
      'minimax/minimax-m2.7',
      'deepseek/deepseek-v4.1-flash',
      '~deepseek/deepseek-flash-latest',
      'deepseek/deepseek-v4-pro-0813',
      'deepseek/deepseek-v4-flash-0731',
      'deepseek/deepseek-v4-flash',
      'xiaomi/mimo-v2.6-pro',
      'xiaomi/mimo-v2.6-flash',
    ],
  },
  Google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    models: [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ],
  },
  'Tencent TokenHub': {
    url: 'https://tokenhub.tencentmaas.com/v1',
    models: tencentTokenHubModels,
  },
};

export function getEffectiveProviderUrl(provider: string, useTokenPlan: boolean): string {
  if (provider === 'Tencent TokenHub' && useTokenPlan) {
    return TENCENT_TOKEN_PLAN_URL;
  }
  return PROVIDERS[provider]?.url ?? PROVIDERS.OpenAI.url;
}

export function getDefaultModelsForProvider(provider: string, useTokenPlan: boolean): string[] {
  const models = [...(PROVIDERS[provider]?.models ?? PROVIDERS.OpenAI.models)];
  if (provider === 'Tencent TokenHub' && useTokenPlan && !models.includes('tc-code-latest')) {
    models.push('tc-code-latest');
  }
  return models;
}

export function getFetchModelsUrl(provider: string, baseUrl: string, useTokenPlan: boolean): string {
  if (provider === 'OpenRouter') return 'https://openrouter.ai/api/v1/models';
  if (provider === 'Google') return 'https://generativelanguage.googleapis.com/v1beta/models';
  if (provider === 'Tencent TokenHub' && useTokenPlan) return `${TENCENT_TOKEN_PLAN_URL}/models`;
  return `${baseUrl.replace(/\/+$/, '')}/models`;
}

function isUsableGoogleTextModel(id: string): boolean {
  const lower = id.toLowerCase();
  return lower.startsWith('gemini-')
    && !lower.includes('embedding')
    && !lower.includes('imagen')
    && !lower.includes('image')
    && !lower.includes('tts')
    && !lower.includes('transcribe')
    && !lower.includes('video')
    && !lower.includes('veo');
}

export function parseModelListResponse(provider: string, data: unknown): string[] {
  const record = data as Record<string, unknown>;
  let models: string[] = [];

  if (provider === 'Google') {
    const googleModels = Array.isArray(record.models) ? record.models : [];
    models = googleModels
      .map((model) => typeof model === 'object' && model !== null ? String((model as Record<string, unknown>).name ?? '') : '')
      .map((name) => name.replace(/^models\//, ''))
      .filter(isUsableGoogleTextModel);
  } else {
    const list = Array.isArray(record.data) ? record.data : [];
    models = list
      .filter((model) => {
        if (typeof model !== 'object' || model === null) return false;
        const status = (model as Record<string, unknown>).status;
        return status === undefined || status === 'online';
      })
      .map((model) => typeof model === 'object' && model !== null ? String((model as Record<string, unknown>).id ?? '') : '')
      .filter(Boolean);
  }

  return Array.from(new Set(models));
}
