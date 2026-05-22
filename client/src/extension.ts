import * as path from 'node:path';
import {
  commands,
  ExtensionContext,
  window,
  workspace,
} from 'vscode';
import type { FileSystemWatcher } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import {
  VEML_LANGUAGE_ID,
  OUTPUT_CHANNEL_NAME,
  ContextKeys,
  Commands,
  Views,
  LspNotifications,
  LspRequests,
} from '../../shared/src/constants.js';
import { ProjectDiscovery } from './projectDiscovery.js';
import { SceneOutlineProvider } from './sceneOutlineProvider.js';
import { registerNewWorldProjectCommand } from './scaffolding/newWorldProjectCommand.js';
import { JsconfigManager } from './jsconfigManager.js';
import { createVemlWorldApi } from './api/vemlWorldApi.js';
import type { VemlWorldApi } from '../../shared/src/apiTypes.js';
import { Tier } from '../../shared/src/tier.types.js';
import { CapabilityRegistry } from './capabilities/capabilityRegistry.js';
import { TierPromptService } from './capabilities/tierPromptService.js';
import { TierDetector } from './capabilities/tierDetector.js';
import { createTierStatusBar, showTierQuickPick } from './capabilities/tierStatusBar.js';

let client: LanguageClient | undefined;
let vemlFileWatcher: FileSystemWatcher | undefined;
let tierPrompt: TierPromptService | undefined;

/** Returns the active TierPromptService, or undefined if not yet initialized. */
export function getTierPromptService(): TierPromptService | undefined {
  return tierPrompt;
}

export async function activate(context: ExtensionContext): Promise<VemlWorldApi | undefined> {
  const activateStart = Date.now();
  const outputChannel = window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  outputChannel.appendLine('[extension] Activating WorldKit VEML extension');

  // Workspace trust check (AC #6)
  if (!workspace.isTrusted) {
    outputChannel.appendLine('[activation] Workspace not trusted — limited to syntax highlighting');
    await commands.executeCommand('setContext', ContextKeys.projectDetected, false);
    await commands.executeCommand('setContext', ContextKeys.hasVemlFiles, false);

    // Re-run discovery when trust is granted
    context.subscriptions.push(
      workspace.onDidGrantWorkspaceTrust(async () => {
        outputChannel.appendLine('[activation] Workspace trust granted — running full discovery');
        await runDiscovery(context, outputChannel, activateStart);
      }),
    );
    return undefined;
  }

  return runDiscovery(context, outputChannel, activateStart);
}

async function runDiscovery(
  context: ExtensionContext,
  outputChannel: ReturnType<typeof window.createOutputChannel>,
  activateStart: number,
): Promise<VemlWorldApi | undefined> {
  // Project discovery (AC #1, #2, #3, #4)
  const discovery = new ProjectDiscovery();
  context.subscriptions.push(discovery);

  const projects = await discovery.discoverProjects();
  const elapsed = Date.now() - activateStart;

  const projectDetected = projects.length > 0;
  const hasVemlFiles = projects.some((p) => p.vemlFileCount > 0);

  await commands.executeCommand('setContext', ContextKeys.projectDetected, projectDetected);
  await commands.executeCommand('setContext', ContextKeys.hasVemlFiles, hasVemlFiles);

  outputChannel.appendLine(
    `[activation] Discovered ${projects.length} project(s) in ${elapsed}ms`,
  );

  // Register scaffolding command (available even without language server)
  registerNewWorldProjectCommand(context, outputChannel);

  // Deploy WebVerse type definitions for JS/TS autocomplete
  if (projectDetected) {
    await JsconfigManager.ensureTypes(context, outputChannel);
  }

  if (!projectDetected) {
    outputChannel.appendLine('[activation] No VEML projects found — extension idle');
    // Set up watchers for dynamic activation (AC #5)
    setupFileWatchers(context, outputChannel, discovery);
    return undefined;
  }

  for (const p of projects) {
    outputChannel.appendLine(
      `[activation] Project: ${p.projectType} at ${p.rootUri.fsPath}` +
      (p.vemlFileCount > 0 ? ` (${p.vemlFileCount} .veml files)` : ''),
    );
  }

  // Set up watchers for dynamic changes
  setupFileWatchers(context, outputChannel, discovery);

  // Initialize tier infrastructure (visible before language server starts)
  const tierDetector = new TierDetector(outputChannel);
  context.subscriptions.push(tierDetector);

  const capabilityRegistry = new CapabilityRegistry();
  capabilityRegistry.register({
    id: 'worldkit-vscode.connectToWorldKit',
    tier: Tier.WorldKitConnected,
    label: 'Connect to WorldKit',
    description: 'Enables live preview and WorldKit IPC connection.',
  });
  capabilityRegistry.register({
    id: 'worldkit-vscode.livePreview',
    tier: Tier.WorldKitConnected,
    label: 'Live Preview',
    description: 'Opens a live preview pane connected to WorldKit.',
  });

  const currentTier = tierDetector.getTier();
  await commands.executeCommand('setContext', ContextKeys.tierLevel, currentTier);

  // Status bar visible as soon as project is detected
  const tierStatusBar = createTierStatusBar(currentTier);
  context.subscriptions.push(tierStatusBar);

  // Register internal command for status bar click
  context.subscriptions.push(
    commands.registerCommand('worldkit-vscode._showTierInfo', () => {
      showTierQuickPick(tierDetector.getTier(), capabilityRegistry);
    }),
  );

  // TierPromptService for future Tier 2+ feature upgrade prompts
  tierPrompt = new TierPromptService(capabilityRegistry, context.globalState, outputChannel);

  // Wire tier change → context key update + LSP notification (F1: prep for future use)
  context.subscriptions.push(
    tierDetector.onDidChangeTier(async (newTier) => {
      await commands.executeCommand('setContext', ContextKeys.tierLevel, newTier);
      outputChannel.appendLine(`[tier] Tier changed to ${newTier}`);
      if (client) {
        client.sendNotification(LspNotifications.tierChanged, { tier: newTier });
      }
    }),
  );

  outputChannel.appendLine(`[tier] Tier infrastructure initialized (Tier ${currentTier}: Standalone)`);

  // Start language server
  return startLanguageServer(context, outputChannel);
}

function setupFileWatchers(
  context: ExtensionContext,
  outputChannel: ReturnType<typeof window.createOutputChannel>,
  discovery: ProjectDiscovery,
): void {
  // Watch for .vemlproject file creation/deletion (AC #5)
  const markerWatcher = workspace.createFileSystemWatcher('**/.vemlproject');
  context.subscriptions.push(markerWatcher);

  // Single .veml watcher — reused by language client for synchronization
  if (!vemlFileWatcher) {
    vemlFileWatcher = workspace.createFileSystemWatcher('**/*.veml');
    context.subscriptions.push(vemlFileWatcher);
  }

  const rerunDiscovery = async (): Promise<void> => {
    try {
      outputChannel.appendLine('[watcher] File change detected — re-running project discovery');
      const projects = await discovery.discoverProjects();
      const projectDetected = projects.length > 0;
      const hasVemlFiles = projects.some((p) => p.vemlFileCount > 0);
      await commands.executeCommand('setContext', ContextKeys.projectDetected, projectDetected);
      await commands.executeCommand('setContext', ContextKeys.hasVemlFiles, hasVemlFiles);

      outputChannel.appendLine(
        `[watcher] Re-discovery found ${projects.length} project(s)`,
      );

      // Start language server if project detected and not already running
      if (projectDetected && !client) {
        await startLanguageServer(context, outputChannel);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      outputChannel.appendLine(`[watcher] Re-discovery failed: ${message}`);
    }
  };

  markerWatcher.onDidCreate(rerunDiscovery);
  markerWatcher.onDidDelete(rerunDiscovery);
  vemlFileWatcher.onDidCreate(rerunDiscovery);
  vemlFileWatcher.onDidDelete(rerunDiscovery);
}

async function startLanguageServer(
  context: ExtensionContext,
  outputChannel: ReturnType<typeof window.createOutputChannel>,
): Promise<VemlWorldApi | undefined> {
  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: VEML_LANGUAGE_ID }],
    outputChannel,
    synchronize: {
      // Reuse existing watcher if available, otherwise create one
      fileEvents: vemlFileWatcher ?? workspace.createFileSystemWatcher('**/*.veml'),
    },
  };

  client = new LanguageClient(
    'worldkit-vscode',
    OUTPUT_CHANNEL_NAME,
    serverOptions,
    clientOptions,
  );

  try {
    await client.start();
    outputChannel.appendLine('[extension] Language client started');

    // Register Scene Outline tree view
    const sceneOutlineProvider = new SceneOutlineProvider(client, outputChannel);
    const treeView = window.createTreeView(Views.sceneOutline, {
      treeDataProvider: sceneOutlineProvider,
      showCollapseAll: true,
    });
    context.subscriptions.push(treeView);
    context.subscriptions.push(sceneOutlineProvider);

    // Register showSceneOutline command
    context.subscriptions.push(
      commands.registerCommand(Commands.showSceneOutline, () => {
        treeView.reveal(undefined as unknown as never, { focus: true }).catch(() => {
          // If reveal fails (e.g., tree is empty), just focus the view
          commands.executeCommand(`${Views.sceneOutline}.focus`);
        });
      }),
    );
    // Register validateAll command
    context.subscriptions.push(
      commands.registerCommand(Commands.validateAll, async () => {
        if (!client) {
          window.showWarningMessage('WorldKit: No VEML project detected. Language server is not running.');
          return;
        }
        try {
          const result = await client.sendRequest<{ totalFiles: number; totalDiagnostics: number }>(LspRequests.validateAll);
          if (result.totalFiles === 0) {
            window.showInformationMessage('No VEML files found in the workspace.');
          } else if (result.totalDiagnostics === 0) {
            window.showInformationMessage(`Validated ${result.totalFiles} VEML file(s) — all clean.`);
          } else {
            window.showInformationMessage(
              `Validated ${result.totalFiles} file(s), found ${result.totalDiagnostics} issue(s).`,
            );
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          outputChannel.appendLine(`[validateAll] Failed: ${msg}`);
          window.showWarningMessage('WorldKit: Failed to validate VEML files. Check the output channel for details.');
        }
      }),
    );

    // Auto-refresh outline when server reports scene changes
    context.subscriptions.push(
      client.onNotification(LspNotifications.sceneDidChange, () => {
        sceneOutlineProvider.refresh();
      }),
    );

    // Refresh outline when active editor changes to/from a VEML file
    let previousWasVeml = window.activeTextEditor?.document.languageId === VEML_LANGUAGE_ID;
    context.subscriptions.push(
      window.onDidChangeActiveTextEditor((editor) => {
        const isVeml = editor?.document.languageId === VEML_LANGUAGE_ID;
        if (isVeml || previousWasVeml) {
          sceneOutlineProvider.refresh();
        }
        previousWasVeml = isVeml;
      }),
    );

    outputChannel.appendLine('[extension] Scene Outline registered');

    // Create and return public API for third-party extensions
    const api = createVemlWorldApi(client);
    outputChannel.appendLine(`[extension] Public API v${api.version} ready`);
    return api;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[extension] Failed to start language server: ${message}`);
    window.showErrorMessage(
      `WorldKit VEML: Language server failed to start. Check the "${OUTPUT_CHANNEL_NAME}" output channel for details.`,
    );
    client = undefined;
    return undefined;
  }
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
  }
}
