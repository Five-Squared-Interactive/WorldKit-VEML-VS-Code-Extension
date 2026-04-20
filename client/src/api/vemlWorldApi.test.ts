import { describe, it, expect, vi } from 'vitest';
import { createVemlWorldApi } from './vemlWorldApi.js';
import { LspRequests, LspNotifications } from '../../../shared/src/constants.js';

/** Minimal mock for LanguageClient sendRequest / onNotification. */
function createMockClient(overrides?: {
  sendRequest?: (...args: unknown[]) => Promise<unknown>;
  onNotification?: (...args: unknown[]) => { dispose(): void };
}) {
  return {
    sendRequest: overrides?.sendRequest ?? vi.fn().mockResolvedValue(undefined),
    onNotification: overrides?.onNotification ?? vi.fn().mockReturnValue({ dispose: vi.fn() }),
  } as unknown as import('vscode-languageclient/node').LanguageClient;
}

describe('createVemlWorldApi', () => {
  it('exposes version 0.1.0', () => {
    const api = createVemlWorldApi(createMockClient());
    expect(api.version).toBe('0.1.0');
  });

  // ── queryEntities ─────────────────────────────────────────────────

  it('queryEntities delegates to LSP request', async () => {
    const sendRequest = vi.fn().mockResolvedValue([{ id: 'e1', type: 'static', uri: 'file:///a.veml', range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 5, offset: 5 } } }]);
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.queryEntities();
    expect(sendRequest).toHaveBeenCalledWith(LspRequests.queryEntities, undefined);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
  });

  it('queryEntities passes filter to LSP request', async () => {
    const sendRequest = vi.fn().mockResolvedValue([]);
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    await api.queryEntities({ type: 'dynamic', idPrefix: 'player' });
    expect(sendRequest).toHaveBeenCalledWith(
      LspRequests.queryEntities,
      { filter: { type: 'dynamic', idPrefix: 'player' } },
    );
  });

  it('queryEntities returns empty array on error', async () => {
    const sendRequest = vi.fn().mockRejectedValue(new Error('server down'));
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.queryEntities();
    expect(result).toEqual([]);
  });

  // ── resolveReference ──────────────────────────────────────────────

  it('resolveReference delegates to LSP request', async () => {
    const entity = { id: 'player', type: 'dynamic', uri: 'file:///a.veml', range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 5, offset: 5 } } };
    const sendRequest = vi.fn().mockResolvedValue(entity);
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.resolveReference('player');
    expect(sendRequest).toHaveBeenCalledWith(LspRequests.resolveEntityReference, { entityId: 'player' });
    expect(result?.id).toBe('player');
  });

  it('resolveReference returns undefined when not found', async () => {
    const sendRequest = vi.fn().mockResolvedValue(undefined);
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.resolveReference('nonexistent');
    expect(result).toBeUndefined();
  });

  it('resolveReference with empty string entityId delegates normally', async () => {
    const sendRequest = vi.fn().mockResolvedValue(undefined);
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.resolveReference('');
    expect(sendRequest).toHaveBeenCalledWith(LspRequests.resolveEntityReference, { entityId: '' });
    expect(result).toBeUndefined();
  });

  it('resolveReference returns undefined on error', async () => {
    const sendRequest = vi.fn().mockRejectedValue(new Error('server down'));
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.resolveReference('player');
    expect(result).toBeUndefined();
  });

  // ── getSceneHierarchy ─────────────────────────────────────────────

  it('getSceneHierarchy delegates to LSP request', async () => {
    const nodes = [{ label: 'world', type: 'world', children: [] }];
    const sendRequest = vi.fn().mockResolvedValue(nodes);
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.getSceneHierarchy('file:///a.veml');
    expect(sendRequest).toHaveBeenCalledWith(LspRequests.getSceneHierarchy, { uri: 'file:///a.veml' });
    expect(result).toHaveLength(1);
  });

  it('getSceneHierarchy returns empty array on error', async () => {
    const sendRequest = vi.fn().mockRejectedValue(new Error('server down'));
    const api = createVemlWorldApi(createMockClient({ sendRequest }));

    const result = await api.getSceneHierarchy('file:///a.veml');
    expect(result).toEqual([]);
  });

  // ── onDidChangeWorld ──────────────────────────────────────────────

  it('onDidChangeWorld subscribes to sceneDidChange notification', () => {
    const onNotification = vi.fn().mockReturnValue({ dispose: vi.fn() });
    const api = createVemlWorldApi(createMockClient({ onNotification }));

    const listener = vi.fn();
    api.onDidChangeWorld(listener);

    expect(onNotification).toHaveBeenCalledWith(
      LspNotifications.sceneDidChange,
      expect.any(Function),
    );
  });

  it('onDidChangeWorld fires listener with WorldChangeEvent', () => {
    let capturedCallback: ((params: { uri: string; changeType?: string }) => void) | undefined;
    const onNotification = vi.fn().mockImplementation((_method: string, cb: (params: { uri: string; changeType?: string }) => void) => {
      capturedCallback = cb;
      return { dispose: vi.fn() };
    });
    const api = createVemlWorldApi(createMockClient({ onNotification }));

    const listener = vi.fn();
    api.onDidChangeWorld(listener);

    // Simulate server notification with explicit changeType
    capturedCallback!({ uri: 'file:///test.veml', changeType: 'changed' });

    expect(listener).toHaveBeenCalledWith({
      uri: 'file:///test.veml',
      changeType: 'changed',
    });
  });

  it('onDidChangeWorld forwards added/removed changeType from server', () => {
    let capturedCallback: ((params: { uri: string; changeType?: string }) => void) | undefined;
    const onNotification = vi.fn().mockImplementation((_method: string, cb: (params: { uri: string; changeType?: string }) => void) => {
      capturedCallback = cb;
      return { dispose: vi.fn() };
    });
    const api = createVemlWorldApi(createMockClient({ onNotification }));

    const listener = vi.fn();
    api.onDidChangeWorld(listener);

    capturedCallback!({ uri: 'file:///new.veml', changeType: 'added' });
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///new.veml', changeType: 'added' });

    capturedCallback!({ uri: 'file:///old.veml', changeType: 'removed' });
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///old.veml', changeType: 'removed' });
  });

  it('onDidChangeWorld defaults to changed when changeType missing', () => {
    let capturedCallback: ((params: { uri: string; changeType?: string }) => void) | undefined;
    const onNotification = vi.fn().mockImplementation((_method: string, cb: (params: { uri: string; changeType?: string }) => void) => {
      capturedCallback = cb;
      return { dispose: vi.fn() };
    });
    const api = createVemlWorldApi(createMockClient({ onNotification }));

    const listener = vi.fn();
    api.onDidChangeWorld(listener);

    // Simulate legacy notification without changeType
    capturedCallback!({ uri: 'file:///test.veml' });
    expect(listener).toHaveBeenCalledWith({ uri: 'file:///test.veml', changeType: 'changed' });
  });

  it('onDidChangeWorld dispose stops listening', () => {
    const disposeFn = vi.fn();
    const onNotification = vi.fn().mockReturnValue({ dispose: disposeFn });
    const api = createVemlWorldApi(createMockClient({ onNotification }));

    const sub = api.onDidChangeWorld(() => {});
    sub.dispose();

    expect(disposeFn).toHaveBeenCalled();
  });
});
