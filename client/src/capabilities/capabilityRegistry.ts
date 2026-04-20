import { Tier, TIER_LABELS } from '../../../shared/src/tier.types.js';
import type { TierCapability } from '../../../shared/src/tier.types.js';

/**
 * Centralized registry for tier-gated capabilities.
 * All tier checks MUST go through this registry — no inline `if (tier === X)`.
 */
export class CapabilityRegistry {
  private readonly capabilities = new Map<string, TierCapability>();

  /** Register a tier-gated capability. */
  register(capability: TierCapability): void {
    this.capabilities.set(capability.id, capability);
  }

  /** Check whether a capability is available at the given tier. */
  isAvailable(id: string, currentTier: Tier): boolean {
    const cap = this.capabilities.get(id);
    if (!cap) return false;
    return currentTier >= cap.tier;
  }

  /** Get the unavailable message for a capability, or undefined if available/unknown. */
  getUnavailableMessage(id: string, currentTier: Tier): string | undefined {
    const cap = this.capabilities.get(id);
    if (!cap) return undefined;
    if (currentTier >= cap.tier) return undefined;
    return `"${cap.label}" requires ${TIER_LABELS[cap.tier]} (current: ${TIER_LABELS[currentTier]}).`;
  }

  /** Return all registered capabilities. */
  getAllCapabilities(): readonly TierCapability[] {
    return [...this.capabilities.values()];
  }
}
