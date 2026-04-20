import { window } from 'vscode';
import type { Memento, OutputChannel } from 'vscode';
import { Tier } from '../../../shared/src/tier.types.js';
import type { CapabilityRegistry } from './capabilityRegistry.js';

const GLOBAL_STATE_KEY = 'worldkit-vscode.dismissedTierPrompts';

/**
 * Shows contextual upgrade prompts when Tier 2+ features are attempted.
 * Respects session-level and persistent "Don't Show Again" dismissals.
 */
export class TierPromptService {
  private readonly sessionDismissed = new Set<string>();

  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly globalState: Memento,
    private readonly outputChannel: OutputChannel,
  ) {}

  /** Show an upgrade prompt for the given capability, unless previously dismissed. */
  async showUpgradePrompt(capabilityId: string, currentTier: Tier): Promise<void> {
    // Check session dismissal
    if (this.sessionDismissed.has(capabilityId)) return;

    // Check persistent dismissal
    const persisted = this.globalState.get<string[]>(GLOBAL_STATE_KEY, []);
    if (persisted.includes(capabilityId)) return;

    const message = this.registry.getUnavailableMessage(capabilityId, currentTier);
    if (!message) return;

    this.outputChannel.appendLine(`[tier] Showing upgrade prompt for ${capabilityId}`);

    const selection = await window.showInformationMessage(
      message,
      'Learn More',
      "Don't Show Again",
    );

    // Always dismiss for this session regardless of button clicked
    this.sessionDismissed.add(capabilityId);

    if (selection === "Don't Show Again") {
      const current = this.globalState.get<string[]>(GLOBAL_STATE_KEY, []);
      await this.globalState.update(GLOBAL_STATE_KEY, [...current, capabilityId]);
      this.outputChannel.appendLine(`[tier] Permanently dismissed prompt for ${capabilityId}`);
    }
  }
}
