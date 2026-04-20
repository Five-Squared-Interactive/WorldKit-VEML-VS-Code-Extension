import {
  EventEmitter,
  Range,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  Uri,
  window,
} from 'vscode';
import type {
  OutputChannel,
  TreeDataProvider,
} from 'vscode';
import type { LanguageClient } from 'vscode-languageclient/node';
import type { SceneNode } from '../../shared/src/sceneTypes.js';
import { LspRequests } from '../../shared/src/constants.js';
import { createTreeItem, createMessageNode, MESSAGE_NODE_KIND } from './sceneOutline.js';
import type { CommandSelectionArg } from './sceneOutline.js';

/**
 * TreeDataProvider for the Scene Outline sidebar panel.
 * Fetches scene hierarchy from the language server via LSP custom request.
 */
export class SceneOutlineProvider implements TreeDataProvider<SceneNode> {
  private readonly _onDidChangeTreeData = new EventEmitter<SceneNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private cachedRoots: SceneNode[] = [];
  private currentDocUri: string | undefined;

  constructor(
    private readonly client: LanguageClient,
    private readonly outputChannel: OutputChannel,
  ) {}

  /**
   * Refresh the scene outline tree.
   * Fires the onDidChangeTreeData event to trigger VS Code to re-query getChildren.
   */
  refresh(): void {
    this.cachedRoots = [];
    this.currentDocUri = undefined;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SceneNode): TreeItem {
    // Message nodes get special treatment
    if (element.nodeKind === MESSAGE_NODE_KIND) {
      const item = new TreeItem(element.label, TreeItemCollapsibleState.None);
      item.iconPath = new ThemeIcon('info');
      return item;
    }

    const desc = createTreeItem(element, this.currentDocUri);
    const item = new TreeItem(desc.label, desc.collapsibleState as TreeItemCollapsibleState);
    item.description = desc.description;
    item.contextValue = desc.contextValue;
    item.iconPath = new ThemeIcon(desc.iconId);
    item.accessibilityInformation = desc.accessibilityInformation;

    // Wire click-to-navigate command using typed CommandSelectionArg
    if (desc.command?.arguments && this.currentDocUri) {
      const arg = desc.command.arguments[0] as CommandSelectionArg;
      const sel = arg.selection;
      item.command = {
        command: 'vscode.open',
        title: desc.command.title,
        arguments: [
          Uri.parse(this.currentDocUri),
          { selection: new Range(sel.startLine, sel.startCharacter, sel.endLine, sel.endCharacter) },
        ],
      };
    }

    return item;
  }

  async getChildren(element?: SceneNode): Promise<SceneNode[]> {
    // Child expansion — return pre-fetched children
    if (element) {
      return element.children;
    }

    // Root call — fetch hierarchy from server
    const editor = window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'veml') {
      this.currentDocUri = undefined;
      return [createMessageNode('Open a VEML file to see scene outline')];
    }

    try {
      const uri = editor.document.uri.toString();
      this.currentDocUri = uri;
      const nodes = await this.client.sendRequest<SceneNode[]>(
        LspRequests.getSceneHierarchy,
        { uri },
      );
      this.cachedRoots = nodes;
      return nodes.length > 0 ? nodes : [createMessageNode('No scene elements found')];
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.outputChannel.appendLine(`[sceneOutline] Failed to fetch hierarchy: ${message}`);
      return [createMessageNode('Failed to load scene outline')];
    }
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
