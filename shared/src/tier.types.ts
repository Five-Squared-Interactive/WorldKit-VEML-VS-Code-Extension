/**
 * Tier levels representing the extension's connection state.
 * Tier 1 = standalone VS Code extension.
 * Tier 2 = connected to WorldKit desktop app.
 * Tier 3 = connected to WebVerse runtime.
 */
export enum Tier {
  Standalone = 1,
  WorldKitConnected = 2,
  WebVerseConnected = 3,
}

/** Human-readable labels for each tier. Single source of truth. */
export const TIER_LABELS: Record<Tier, string> = {
  [Tier.Standalone]: 'Standalone',
  [Tier.WorldKitConnected]: 'WorldKit Connected',
  [Tier.WebVerseConnected]: 'WebVerse Connected',
};

/**
 * Describes a capability that is gated behind a specific tier.
 * Registered in CapabilityRegistry for centralized tier checking.
 */
export interface TierCapability {
  /** Unique identifier, e.g. 'worldkit-vscode.connectToWorldKit'. */
  readonly id: string;
  /** Minimum tier required for this capability. */
  readonly tier: Tier;
  /** Short human-readable label for UI display. */
  readonly label: string;
  /** Longer description explaining what the capability provides. */
  readonly description: string;
}
