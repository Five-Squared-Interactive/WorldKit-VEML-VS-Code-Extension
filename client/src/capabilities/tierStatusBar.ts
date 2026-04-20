import { StatusBarAlignment, StatusBarItem, window, QuickPickItem, QuickPickItemKind } from 'vscode';
import { Tier, TIER_LABELS } from '../../../shared/src/tier.types.js';
import type { CapabilityRegistry } from './capabilityRegistry.js';

/**
 * Creates a status bar item showing the current tier level.
 * Click opens a QuickPick listing current tier and all registered capabilities.
 */
export function createTierStatusBar(
  currentTier: Tier,
): StatusBarItem {
  const item = window.createStatusBarItem(StatusBarAlignment.Right, 0);
  item.text = `$(globe) WorldKit: ${TIER_LABELS[currentTier]}`;
  item.tooltip = `WorldKit tier: ${TIER_LABELS[currentTier]}. Click to see capabilities.`;
  item.command = 'worldkit-vscode._showTierInfo';
  item.show();
  return item;
}

/**
 * Shows a QuickPick with current tier and capability availability.
 */
export async function showTierQuickPick(
  currentTier: Tier,
  registry: CapabilityRegistry,
): Promise<void> {
  const capabilities = registry.getAllCapabilities();

  const items: QuickPickItem[] = [
    {
      label: `$(info) Current Tier: ${TIER_LABELS[currentTier]}`,
      description: `Tier ${currentTier}`,
      kind: QuickPickItemKind.Separator,
    },
  ];

  if (capabilities.length === 0) {
    items.push({
      label: '$(check) All features available at this tier',
      description: '',
    });
  } else {
    for (const cap of capabilities) {
      const available = currentTier >= cap.tier;
      const icon = available ? '$(check)' : '$(lock)';
      items.push({
        label: `${icon} ${cap.label}`,
        description: available ? 'Available' : `Requires ${TIER_LABELS[cap.tier]}`,
        detail: cap.description,
      });
    }
  }

  await window.showQuickPick(items, {
    title: 'WorldKit Capabilities',
    placeHolder: 'Tier-gated capabilities',
  });
}
