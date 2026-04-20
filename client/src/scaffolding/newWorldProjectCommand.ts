/**
 * VS Code command registration for "WorldKit: New World Project".
 * Handles QuickPick template selection, project name input, folder picker, and file writing.
 */

import * as path from 'node:path';
import {
  commands,
  Uri,
  window,
  workspace,
} from 'vscode';
import type { ExtensionContext } from 'vscode';
import { Commands } from '../../../shared/src/constants.js';
import { ALL_TEMPLATES } from './templates.js';
import { scaffoldProject } from './scaffoldProject.js';

/**
 * Register the newWorldProject command.
 * This command is available even without a language server — scaffolding creates new projects.
 */
export function registerNewWorldProjectCommand(
  context: ExtensionContext,
  outputChannel: ReturnType<typeof window.createOutputChannel>,
): void {
  context.subscriptions.push(
    commands.registerCommand(Commands.newWorldProject, async () => {
      // Step 1: Template selection via QuickPick
      const templatePick = await window.showQuickPick(
        ALL_TEMPLATES.map((t) => ({
          label: t.label,
          description: t.description,
          detail: t.detail,
          templateId: t.id,
        })),
        {
          title: 'WorldKit: New World Project',
          placeHolder: 'Select a project template',
        },
      );
      if (!templatePick) return; // cancelled

      const template = ALL_TEMPLATES.find((t) => t.id === templatePick.templateId);
      if (!template) return;

      // Step 2: Project name input
      const projectName = await window.showInputBox({
        title: 'Project Name',
        prompt: 'Enter a name for your new world project',
        placeHolder: 'my-world',
        validateInput: (value) => {
          if (!value.trim()) return 'Project name cannot be empty';
          if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return undefined;
        },
      });
      if (!projectName) return; // cancelled

      // Step 3: Target directory selection
      const targetFolders = await window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Parent Folder',
        title: 'Choose where to create the project',
      });
      if (!targetFolders || targetFolders.length === 0) return; // cancelled

      const projectDir = Uri.file(path.join(targetFolders[0].fsPath, projectName));

      // Check if target directory already exists
      try {
        await workspace.fs.stat(projectDir);
        // Directory exists — confirm overwrite
        const overwrite = await window.showWarningMessage(
          `Directory "${projectName}" already exists in the selected folder. Overwrite existing files?`,
          { modal: true },
          'Overwrite',
        );
        if (overwrite !== 'Overwrite') return;
      } catch {
        // stat throws when path doesn't exist — this is the expected happy path
      }

      // Step 4: Scaffold files
      try {
        const files = scaffoldProject(template, projectName);
        const encoder = new TextEncoder();

        for (const file of files) {
          const fileUri = Uri.file(path.join(projectDir.fsPath, file.relativePath));
          await workspace.fs.writeFile(fileUri, encoder.encode(file.content));
        }

        outputChannel.appendLine(
          `[scaffolding] Created ${template.label} project "${projectName}" at ${projectDir.fsPath} (${files.length} files)`,
        );

        // Step 5: Offer to open in new window
        const openChoice = await window.showInformationMessage(
          `WorldKit: Created "${projectName}" project with ${files.length} files.`,
          'Open in New Window',
          'Open in Current Window',
        );

        if (openChoice === 'Open in New Window') {
          await commands.executeCommand('vscode.openFolder', projectDir, { forceNewWindow: true });
        } else if (openChoice === 'Open in Current Window') {
          await commands.executeCommand('vscode.openFolder', projectDir);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[scaffolding] Failed to create project: ${msg}`);
        window.showWarningMessage(
          `WorldKit: Failed to create project. ${msg}`,
        );
      }
    }),
  );
}
