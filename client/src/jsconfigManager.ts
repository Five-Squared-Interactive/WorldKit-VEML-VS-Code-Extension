/**
 * Manages jsconfig.json and .worldkit/types/webverse.d.ts deployment
 * for VEML projects, providing WebVerse API type support in JS files.
 */

import * as path from 'node:path';
import { Uri, workspace } from 'vscode';
import type { ExtensionContext, OutputChannel } from 'vscode';

/** Directory inside the project where types are deployed. */
const TYPES_DIR = '.worldkit/types/webverse';
/** Filename used inside the deployed types directory. */
const TYPES_FILENAME = 'index.d.ts';
/** Filename of the bundled source types shipped with the extension. */
const BUNDLED_TYPES_FILENAME = 'webverse.d.ts';
const VERSION_PATTERN = /^\/\/ WebVerse API Types v([\d.]+)/;

export class JsconfigManager {
  /**
   * Ensure WebVerse types are deployed and jsconfig.json is configured.
   * Safe to call on every activation — only writes when needed.
   */
  static async ensureTypes(
    context: ExtensionContext,
    outputChannel: OutputChannel,
  ): Promise<void> {
    const folders = workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;

    for (const folder of folders) {
      try {
        await JsconfigManager.ensureTypesForFolder(folder.uri, context, outputChannel);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[jsconfig] Failed for ${folder.uri.fsPath}: ${msg}`);
      }
    }
  }

  private static async ensureTypesForFolder(
    folderUri: Uri,
    context: ExtensionContext,
    outputChannel: OutputChannel,
  ): Promise<void> {
    // Deploy webverse.d.ts to .worldkit/types/
    const deployed = await JsconfigManager.deployTypes(folderUri, context, outputChannel);
    if (!deployed) return;

    // Check for tsconfig.json — if present, skip jsconfig.json management
    const tsconfigUri = Uri.joinPath(folderUri, 'tsconfig.json');
    if (await fileExists(tsconfigUri)) {
      outputChannel.appendLine('[jsconfig] tsconfig.json found — skipping jsconfig.json creation');
      return;
    }

    // Ensure jsconfig.json
    await JsconfigManager.ensureJsconfig(folderUri, outputChannel);

    // Ensure .worldkit/ is in .gitignore
    await JsconfigManager.ensureGitignore(folderUri, outputChannel);
  }

  /**
   * Deploy webverse.d.ts from extension assets to .worldkit/types/.
   * Returns true if deployment occurred, false if already up-to-date.
   */
  private static async deployTypes(
    folderUri: Uri,
    context: ExtensionContext,
    outputChannel: OutputChannel,
  ): Promise<boolean> {
    const typesDir = Uri.joinPath(folderUri, TYPES_DIR);
    const targetUri = Uri.joinPath(typesDir, TYPES_FILENAME);

    // Read bundled version
    const bundledUri = Uri.file(context.asAbsolutePath(path.join('types', BUNDLED_TYPES_FILENAME)));
    let bundledContent: Uint8Array;
    try {
      bundledContent = await workspace.fs.readFile(bundledUri);
    } catch {
      outputChannel.appendLine('[jsconfig] Bundled webverse.d.ts not found — skipping');
      return false;
    }

    const bundledVersion = extractVersion(new TextDecoder().decode(bundledContent));

    // Check existing version
    try {
      const existingContent = await workspace.fs.readFile(targetUri);
      const existingVersion = extractVersion(new TextDecoder().decode(existingContent));
      if (existingVersion && existingVersion === bundledVersion) {
        outputChannel.appendLine(`[jsconfig] webverse.d.ts v${existingVersion} is current`);
        return true;
      }
      outputChannel.appendLine(
        `[jsconfig] Updating webverse.d.ts: v${existingVersion ?? 'unknown'} → v${bundledVersion ?? 'unknown'}`,
      );
    } catch {
      outputChannel.appendLine('[jsconfig] Deploying webverse.d.ts');
    }

    // Create directory and write file
    await workspace.fs.createDirectory(typesDir);
    await workspace.fs.writeFile(targetUri, bundledContent);
    return true;
  }

  /**
   * Create jsconfig.json if absent, or add the types path to include if present.
   */
  private static async ensureJsconfig(
    folderUri: Uri,
    outputChannel: OutputChannel,
  ): Promise<void> {
    const jsconfigUri = Uri.joinPath(folderUri, 'jsconfig.json');
    const typesInclude = `./${TYPES_DIR}/${TYPES_FILENAME}`;

    try {
      // Read existing jsconfig.json
      const content = new TextDecoder().decode(await workspace.fs.readFile(jsconfigUri));
      const config = JSON.parse(content);

      // Ensure include array contains the types path
      if (!Array.isArray(config.include)) {
        config.include = [];
      }
      if (!config.include.includes(typesInclude)) {
        config.include.push(typesInclude);
        const updated = JSON.stringify(config, null, 2) + '\n';
        await workspace.fs.writeFile(jsconfigUri, new TextEncoder().encode(updated));
        outputChannel.appendLine('[jsconfig] Added types path to existing jsconfig.json include');
      } else {
        outputChannel.appendLine('[jsconfig] jsconfig.json already includes types path');
      }
    } catch {
      // File doesn't exist or invalid JSON — create new
      const newConfig = {
        compilerOptions: {
          checkJs: true,
        },
        include: ['**/*.js', typesInclude],
      };
      const content = JSON.stringify(newConfig, null, 2) + '\n';
      await workspace.fs.writeFile(jsconfigUri, new TextEncoder().encode(content));
      outputChannel.appendLine('[jsconfig] Created jsconfig.json');
    }
  }

  /**
   * Ensure .worldkit/ is in .gitignore.
   */
  private static async ensureGitignore(
    folderUri: Uri,
    outputChannel: OutputChannel,
  ): Promise<void> {
    const gitignoreUri = Uri.joinPath(folderUri, '.gitignore');
    const entry = '.worldkit/';

    try {
      const content = new TextDecoder().decode(await workspace.fs.readFile(gitignoreUri));
      if (content.includes(entry)) return;

      const separator = content.endsWith('\n') ? '' : '\n';
      const updated = content + separator + entry + '\n';
      await workspace.fs.writeFile(gitignoreUri, new TextEncoder().encode(updated));
      outputChannel.appendLine('[jsconfig] Added .worldkit/ to .gitignore');
    } catch {
      // No .gitignore — create one
      await workspace.fs.writeFile(gitignoreUri, new TextEncoder().encode(entry + '\n'));
      outputChannel.appendLine('[jsconfig] Created .gitignore with .worldkit/');
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function extractVersion(content: string): string | undefined {
  const match = content.match(VERSION_PATTERN);
  return match?.[1];
}

async function fileExists(uri: Uri): Promise<boolean> {
  try {
    await workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
