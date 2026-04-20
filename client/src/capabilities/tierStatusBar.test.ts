import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTierStatusBar, showTierQuickPick } from './tierStatusBar.js';
import { CapabilityRegistry } from './capabilityRegistry.js';
import { Tier } from '../../../shared/src/tier.types.js';

const mockStatusBarItem = {
  text: '',
  tooltip: '',
  command: '',
  show: vi.fn(),
  hide: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('vscode', () => ({
  StatusBarAlignment: { Left: 1, Right: 2 },
  QuickPickItemKind: { Separator: -1 },
  window: {
    createStatusBarItem: vi.fn(() => ({ ...mockStatusBarItem })),
    showQuickPick: vi.fn().mockResolvedValue(undefined),
  },
  QuickPickItem: class {},
}));

import { window } from 'vscode';

function setupRegistry(): CapabilityRegistry {
  const reg = new CapabilityRegistry();
  reg.register({
    id: 'worldkit-vscode.connectToWorldKit',
    tier: Tier.WorldKitConnected,
    label: 'Connect to WorldKit',
    description: 'Enables live preview.',
  });
  reg.register({
    id: 'worldkit-vscode.livePreview',
    tier: Tier.WorldKitConnected,
    label: 'Live Preview',
    description: 'Opens a live preview pane.',
  });
  return reg;
}

describe('createTierStatusBar', () => {
  beforeEach(() => {
    vi.mocked(window.createStatusBarItem).mockReturnValue({ ...mockStatusBarItem } as never);
  });

  it('displays Standalone text for Tier 1', () => {
    const item = createTierStatusBar(Tier.Standalone);
    expect(item.text).toBe('$(globe) WorldKit: Standalone');
  });

  it('sets tooltip with current tier', () => {
    const item = createTierStatusBar(Tier.Standalone);
    expect(item.tooltip).toContain('Standalone');
    expect(item.tooltip).toContain('Click');
  });

  it('sets command for click action', () => {
    const item = createTierStatusBar(Tier.Standalone);
    expect(item.command).toBe('worldkit-vscode._showTierInfo');
  });

  it('calls show() on the status bar item', () => {
    const mockItem = { ...mockStatusBarItem, show: vi.fn() };
    vi.mocked(window.createStatusBarItem).mockReturnValue(mockItem as never);
    createTierStatusBar(Tier.Standalone);
    expect(mockItem.show).toHaveBeenCalled();
  });

  it('displays WorldKit Connected for Tier 2', () => {
    const item = createTierStatusBar(Tier.WorldKitConnected);
    expect(item.text).toBe('$(globe) WorldKit: WorldKit Connected');
  });
});

describe('showTierQuickPick', () => {
  beforeEach(() => {
    vi.mocked(window.showQuickPick).mockReset();
    vi.mocked(window.showQuickPick).mockResolvedValue(undefined);
  });

  it('shows QuickPick with current tier and capabilities', async () => {
    await showTierQuickPick(Tier.Standalone, setupRegistry());

    expect(window.showQuickPick).toHaveBeenCalledOnce();
    const items = vi.mocked(window.showQuickPick).mock.calls[0][0] as Array<{ label: string; description?: string }>;

    // First item should show current tier
    expect(items[0].label).toContain('Standalone');

    // Capability items should show as locked
    expect(items[1].label).toContain('lock');
    expect(items[1].description).toContain('Requires');
  });

  it('shows capabilities as available when tier is sufficient', async () => {
    await showTierQuickPick(Tier.WorldKitConnected, setupRegistry());

    const items = vi.mocked(window.showQuickPick).mock.calls[0][0] as Array<{ label: string; description?: string }>;

    // Capabilities should show as available
    expect(items[1].label).toContain('check');
    expect(items[1].description).toBe('Available');
  });

  it('shows "all features available" when registry is empty', async () => {
    const emptyReg = new CapabilityRegistry();
    await showTierQuickPick(Tier.Standalone, emptyReg);

    const items = vi.mocked(window.showQuickPick).mock.calls[0][0] as Array<{ label: string }>;
    expect(items.some((i) => i.label.includes('All features available'))).toBe(true);
  });
});
