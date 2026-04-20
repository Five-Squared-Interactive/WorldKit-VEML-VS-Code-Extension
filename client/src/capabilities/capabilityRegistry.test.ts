import { describe, it, expect } from 'vitest';
import { CapabilityRegistry } from './capabilityRegistry.js';
import { Tier } from '../../../shared/src/tier.types.js';
import type { TierCapability } from '../../../shared/src/tier.types.js';

const connectCap: TierCapability = {
  id: 'worldkit-vscode.connectToWorldKit',
  tier: Tier.WorldKitConnected,
  label: 'Connect to WorldKit',
  description: 'Enables live preview via WorldKit IPC.',
};

const livePreviewCap: TierCapability = {
  id: 'worldkit-vscode.livePreview',
  tier: Tier.WorldKitConnected,
  label: 'Live Preview',
  description: 'Opens a live preview pane connected to WorldKit.',
};

describe('CapabilityRegistry', () => {
  it('registers and retrieves capabilities', () => {
    const reg = new CapabilityRegistry();
    reg.register(connectCap);
    reg.register(livePreviewCap);

    const all = reg.getAllCapabilities();
    expect(all).toHaveLength(2);
    expect(all.map((c) => c.id)).toContain('worldkit-vscode.connectToWorldKit');
    expect(all.map((c) => c.id)).toContain('worldkit-vscode.livePreview');
  });

  it('isAvailable returns true when current tier meets requirement', () => {
    const reg = new CapabilityRegistry();
    reg.register(connectCap);

    expect(reg.isAvailable(connectCap.id, Tier.WorldKitConnected)).toBe(true);
    expect(reg.isAvailable(connectCap.id, Tier.WebVerseConnected)).toBe(true);
  });

  it('isAvailable returns false when current tier is below requirement', () => {
    const reg = new CapabilityRegistry();
    reg.register(connectCap);

    expect(reg.isAvailable(connectCap.id, Tier.Standalone)).toBe(false);
  });

  it('isAvailable returns false for unknown capability id', () => {
    const reg = new CapabilityRegistry();
    expect(reg.isAvailable('nonexistent', Tier.WebVerseConnected)).toBe(false);
  });

  it('getUnavailableMessage returns message when tier is insufficient', () => {
    const reg = new CapabilityRegistry();
    reg.register(connectCap);

    const msg = reg.getUnavailableMessage(connectCap.id, Tier.Standalone);
    expect(msg).toContain('Connect to WorldKit');
    expect(msg).toContain('WorldKit Connected');
    expect(msg).toContain('Standalone');
  });

  it('getUnavailableMessage returns undefined when tier is sufficient', () => {
    const reg = new CapabilityRegistry();
    reg.register(connectCap);

    expect(reg.getUnavailableMessage(connectCap.id, Tier.WorldKitConnected)).toBeUndefined();
  });

  it('getUnavailableMessage returns undefined for unknown capability', () => {
    const reg = new CapabilityRegistry();
    expect(reg.getUnavailableMessage('nonexistent', Tier.Standalone)).toBeUndefined();
  });

  it('empty registry returns empty capabilities array', () => {
    const reg = new CapabilityRegistry();
    expect(reg.getAllCapabilities()).toEqual([]);
  });

  it('later registration overwrites earlier for same id', () => {
    const reg = new CapabilityRegistry();
    reg.register(connectCap);
    const updated: TierCapability = { ...connectCap, label: 'Updated Label' };
    reg.register(updated);

    const all = reg.getAllCapabilities();
    expect(all).toHaveLength(1);
    expect(all[0].label).toBe('Updated Label');
  });
});
