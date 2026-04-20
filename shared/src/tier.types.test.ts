import { describe, it, expect } from 'vitest';
import { Tier, TIER_LABELS } from './tier.types.js';
import type { TierCapability } from './tier.types.js';

describe('Tier enum', () => {
  it('Standalone equals 1', () => {
    expect(Tier.Standalone).toBe(1);
  });

  it('WorldKitConnected equals 2', () => {
    expect(Tier.WorldKitConnected).toBe(2);
  });

  it('WebVerseConnected equals 3', () => {
    expect(Tier.WebVerseConnected).toBe(3);
  });

  it('tiers are orderable by numeric value', () => {
    expect(Tier.Standalone).toBeLessThan(Tier.WorldKitConnected);
    expect(Tier.WorldKitConnected).toBeLessThan(Tier.WebVerseConnected);
  });
});

describe('TIER_LABELS', () => {
  it('has labels for all tiers', () => {
    expect(TIER_LABELS[Tier.Standalone]).toBe('Standalone');
    expect(TIER_LABELS[Tier.WorldKitConnected]).toBe('WorldKit Connected');
    expect(TIER_LABELS[Tier.WebVerseConnected]).toBe('WebVerse Connected');
  });
});

describe('TierCapability interface', () => {
  it('accepts a valid capability object', () => {
    const cap: TierCapability = {
      id: 'worldkit-vscode.connectToWorldKit',
      tier: Tier.WorldKitConnected,
      label: 'Connect to WorldKit',
      description: 'Enables live preview and WorldKit IPC.',
    };

    expect(cap.id).toBe('worldkit-vscode.connectToWorldKit');
    expect(cap.tier).toBe(Tier.WorldKitConnected);
    expect(cap.label).toBe('Connect to WorldKit');
    expect(cap.description).toBeDefined();
  });

  it('is JSON-serializable', () => {
    const cap: TierCapability = {
      id: 'test.cap',
      tier: Tier.Standalone,
      label: 'Test',
      description: 'A test capability.',
    };
    const parsed = JSON.parse(JSON.stringify(cap));
    expect(parsed.id).toBe('test.cap');
    expect(parsed.tier).toBe(Tier.Standalone);
  });
});
