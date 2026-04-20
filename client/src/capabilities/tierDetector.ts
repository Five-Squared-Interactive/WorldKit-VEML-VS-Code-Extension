import { workspace, Disposable, EventEmitter } from 'vscode';
import type { FileSystemWatcher } from 'vscode';
import type { OutputChannel } from 'vscode';
import { Tier } from '../../../shared/src/tier.types.js';

/**
 * Event-driven tier detection using file system watchers.
 * MVP always returns Tier.Standalone — watcher infrastructure exists for future use.
 *
 * When tier changes, fires `onDidChangeTier`. The extension wiring subscribes to this
 * event and sends `LspNotifications.tierChanged` to the language server.
 */
export class TierDetector implements Disposable {
  private currentTier: Tier = Tier.Standalone;
  private readonly watcher: FileSystemWatcher;
  private readonly tierChangedEmitter = new EventEmitter<Tier>();

  /** Fires when the detected tier changes. Extension wiring sends LspNotifications.tierChanged. */
  readonly onDidChangeTier = this.tierChangedEmitter.event;

  constructor(private readonly outputChannel: OutputChannel) {
    // Watch for .worldkit/ config files — prep for future Tier 2 detection
    this.watcher = workspace.createFileSystemWatcher('**/.worldkit/**');

    // Wire watcher events for future tier detection
    this.watcher.onDidCreate((uri) => {
      this.outputChannel.appendLine(`[tier] .worldkit config created: ${uri.fsPath}`);
      this.evaluateTier();
    });
    this.watcher.onDidDelete((uri) => {
      this.outputChannel.appendLine(`[tier] .worldkit config deleted: ${uri.fsPath}`);
      this.evaluateTier();
    });
  }

  /** Returns the current detected tier. In MVP, always Standalone. */
  getTier(): Tier {
    return this.currentTier;
  }

  /**
   * Re-evaluate tier based on detected markers.
   * MVP: always Standalone. Future: inspect .worldkit/ contents to determine tier.
   */
  private evaluateTier(): void {
    const newTier = Tier.Standalone; // MVP: no tier changes
    if (newTier !== this.currentTier) {
      this.currentTier = newTier;
      this.tierChangedEmitter.fire(newTier);
    }
  }

  dispose(): void {
    this.watcher.dispose();
    this.tierChangedEmitter.dispose();
  }
}
