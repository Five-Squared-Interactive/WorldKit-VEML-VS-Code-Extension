import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TierPromptService } from './tierPromptService.js';
import { CapabilityRegistry } from './capabilityRegistry.js';
import { Tier } from '../../../shared/src/tier.types.js';

// Mock vscode module
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
  },
  Memento: class {},
}));

import { window } from 'vscode';

function createMockGlobalState(initial: Record<string, unknown> = {}): import('vscode').Memento {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get<T>(key: string, defaultValue?: T): T {
      return (store.has(key) ? store.get(key) : defaultValue) as T;
    },
    update(key: string, value: unknown): Thenable<void> {
      store.set(key, value);
      return Promise.resolve();
    },
    keys(): readonly string[] {
      return [...store.keys()];
    },
  };
}

function createMockOutputChannel(): import('vscode').OutputChannel {
  return { appendLine: vi.fn() } as unknown as import('vscode').OutputChannel;
}

function setupRegistry(): CapabilityRegistry {
  const reg = new CapabilityRegistry();
  reg.register({
    id: 'worldkit-vscode.connectToWorldKit',
    tier: Tier.WorldKitConnected,
    label: 'Connect to WorldKit',
    description: 'Enables live preview via WorldKit IPC.',
  });
  return reg;
}

describe('TierPromptService', () => {
  beforeEach(() => {
    vi.mocked(window.showInformationMessage).mockReset();
    vi.mocked(window.showInformationMessage).mockResolvedValue(undefined as unknown as never);
  });

  it('shows prompt when capability is unavailable', async () => {
    const service = new TierPromptService(setupRegistry(), createMockGlobalState(), createMockOutputChannel());

    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.Standalone);

    expect(window.showInformationMessage).toHaveBeenCalledOnce();
    expect(window.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Connect to WorldKit'),
      'Learn More',
      "Don't Show Again",
    );
  });

  it('does not show prompt when capability is available at current tier', async () => {
    const service = new TierPromptService(setupRegistry(), createMockGlobalState(), createMockOutputChannel());

    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.WorldKitConnected);

    expect(window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('does not show prompt for unknown capability', async () => {
    const service = new TierPromptService(setupRegistry(), createMockGlobalState(), createMockOutputChannel());

    await service.showUpgradePrompt('nonexistent', Tier.Standalone);

    expect(window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('session dismissal prevents repeat prompt', async () => {
    const service = new TierPromptService(setupRegistry(), createMockGlobalState(), createMockOutputChannel());

    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.Standalone);
    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.Standalone);

    expect(window.showInformationMessage).toHaveBeenCalledOnce();
  });

  it('"Don\'t Show Again" persists to globalState', async () => {
    vi.mocked(window.showInformationMessage).mockResolvedValue("Don't Show Again" as never);
    const globalState = createMockGlobalState();
    const service = new TierPromptService(setupRegistry(), globalState, createMockOutputChannel());

    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.Standalone);

    const persisted = globalState.get<string[]>('worldkit-vscode.dismissedTierPrompts', []);
    expect(persisted).toContain('worldkit-vscode.connectToWorldKit');
  });

  it('persistent dismissal prevents prompt in new service instance', async () => {
    const globalState = createMockGlobalState({
      'worldkit-vscode.dismissedTierPrompts': ['worldkit-vscode.connectToWorldKit'],
    });
    const service = new TierPromptService(setupRegistry(), globalState, createMockOutputChannel());

    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.Standalone);

    expect(window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('"Learn More" dismisses for session only', async () => {
    vi.mocked(window.showInformationMessage).mockResolvedValue('Learn More' as never);
    const globalState = createMockGlobalState();
    const service = new TierPromptService(setupRegistry(), globalState, createMockOutputChannel());

    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.Standalone);

    // Session dismissed
    expect(window.showInformationMessage).toHaveBeenCalledOnce();

    // NOT persisted to globalState
    const persisted = globalState.get<string[]>('worldkit-vscode.dismissedTierPrompts', []);
    expect(persisted).toEqual([]);

    // Won't show again this session
    await service.showUpgradePrompt('worldkit-vscode.connectToWorldKit', Tier.Standalone);
    expect(window.showInformationMessage).toHaveBeenCalledOnce();
  });
});
