import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_BACKEND_URL,
  getEffectiveProviderUrl,
  getDefaultModelsForProvider,
  getFetchModelsUrl,
  parseModelListResponse,
  PROVIDERS,
} from './providerConfig.ts';

test('default backend URL is same-origin empty string', () => {
  assert.equal(DEFAULT_BACKEND_URL, '');
});

test('Tencent TokenHub defaults include normal and original direct model IDs', () => {
  const models = getDefaultModelsForProvider('Tencent TokenHub', false);

  assert.ok(PROVIDERS['Tencent TokenHub']);
  assert.equal(getEffectiveProviderUrl('Tencent TokenHub', false), 'https://tokenhub.tencentmaas.com/v1');
  assert.ok(models.includes('hy4-preview'));
  assert.ok(models.includes('deepseek-v4-flash'));
  assert.ok(models.includes('deepseek/deepseek-v4-flash'));
  assert.ok(models.includes('mimo-v2.6-flash'));
  assert.equal(models.includes('tc-code-latest'), false);
});

test('Tencent Token Plan switches URL, fetch endpoint, and adds tc-code-latest', () => {
  const models = getDefaultModelsForProvider('Tencent TokenHub', true);

  assert.equal(getEffectiveProviderUrl('Tencent TokenHub', true), 'https://api.lkeap.cloud.tencent.com/plan/v3');
  assert.equal(getFetchModelsUrl('Tencent TokenHub', 'https://api.lkeap.cloud.tencent.com/plan/v3', true), 'https://api.lkeap.cloud.tencent.com/plan/v3/models');
  assert.ok(models.includes('tc-code-latest'));
});

test('OpenRouter defaults include modern high-value Chinese models', () => {
  const models = getDefaultModelsForProvider('OpenRouter', false);

  assert.ok(models.includes('qwen/qwen3.8-flash'));
  assert.ok(models.includes('z-ai/glm-5.3-flash'));
  assert.ok(models.includes('moonshotai/kimi-k3'));
  assert.ok(models.includes('deepseek/deepseek-v4.1-flash'));
  assert.ok(models.includes('xiaomi/mimo-v2.6-pro'));
  assert.equal(models.includes('google/gemini-2.5-flash'), false);
});

test('Google defaults include requested 3.x and 2.5 models', () => {
  const models = getDefaultModelsForProvider('Google', false);

  assert.deepEqual(models, [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
  ]);
});

test('model list parsing handles TokenHub online filtering and Google names', () => {
  assert.deepEqual(
    parseModelListResponse('Tencent TokenHub', {
      object: 'list',
      data: [
        { id: 'hy3', status: 'online' },
        { id: 'offline-model', status: 'offline' },
        { id: 'deepseek-v4-pro' },
      ],
    }),
    ['hy3', 'deepseek-v4-pro'],
  );

  assert.deepEqual(
    parseModelListResponse('Google', {
      models: [
        { name: 'models/gemini-3.8-flash' },
        { name: 'models/gemini-embedding-001' },
        { name: 'models/gemini-3.5-flash-lite' },
      ],
    }),
    ['gemini-3.8-flash', 'gemini-3.5-flash-lite'],
  );
});
