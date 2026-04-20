/**
 * Project auto-discovery service for WorldKit VEML extension.
 * Scans workspace for .vemlproject markers, .veml files, and WorldOS plugin projects.
 */

import * as path from 'node:path';
import {
  workspace,
  EventEmitter,
  Uri,
} from 'vscode';
import type { Disposable, Event } from 'vscode';
import { PROJECT_MARKER_FILE } from '../../shared/src/constants.js';

/** Recognized WorldOS plugin type values in plugin.json. */
const WOS_PLUGIN_TYPES = new Set([
  'wos-plugin',
  'behavior-plugin',
  'sync-plugin',
  'bridge-plugin',
]);

/** Describes a discovered project in the workspace. */
export interface ProjectInfo {
  rootUri: Uri;
  markerUri?: Uri;
  projectType: 'vemlproject' | 'veml-files' | 'wos-plugin';
  vemlFileCount: number;
}

/**
 * Discovers VEML projects in the workspace by scanning for markers and files.
 * Implements Disposable for proper cleanup.
 */
export class ProjectDiscovery implements Disposable {
  private readonly _onDidDiscoverProject = new EventEmitter<ProjectInfo>();
  private readonly disposables: Disposable[] = [];

  /** Fires when a project is discovered. */
  readonly onDidDiscoverProject: Event<ProjectInfo> = this._onDidDiscoverProject.event;

  constructor() {
    this.disposables.push(this._onDidDiscoverProject);
  }

  /**
   * Scan workspace for VEML projects.
   * Priority: .vemlproject markers > .veml file fallback > WorldOS plugin.json
   * Deduplicates by project root path.
   */
  async discoverProjects(): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];
    const seenRoots = new Set<string>();

    try {
      // 1. Scan for .vemlproject marker files
      const markers = await workspace.findFiles(`**/${PROJECT_MARKER_FILE}`, '**/node_modules/**');
      for (const markerUri of markers) {
        const rootPath = path.dirname(markerUri.fsPath);
        if (!seenRoots.has(rootPath)) {
          seenRoots.add(rootPath);
          const project: ProjectInfo = {
            rootUri: Uri.file(rootPath),
            markerUri,
            projectType: 'vemlproject',
            vemlFileCount: 0,
          };
          projects.push(project);
          this._onDidDiscoverProject.fire(project);
        }
      }

      // 2. Scan for .veml files — fallback to workspace root
      const vemlFiles = await workspace.findFiles('**/*.veml', '**/node_modules/**');

      // Update vemlFileCount on already-discovered projects
      if (vemlFiles.length > 0) {
        for (const project of projects) {
          project.vemlFileCount = vemlFiles.length;
        }
      }

      if (vemlFiles.length > 0 && workspace.workspaceFolders) {
        for (const folder of workspace.workspaceFolders) {
          const rootPath = folder.uri.fsPath;
          if (!seenRoots.has(rootPath)) {
            seenRoots.add(rootPath);
            const project: ProjectInfo = {
              rootUri: folder.uri as Uri,
              markerUri: undefined,
              projectType: 'veml-files',
              vemlFileCount: vemlFiles.length,
            };
            projects.push(project);
            this._onDidDiscoverProject.fire(project);
          }
        }
      }

      // 3. Scan for WorldOS plugin.json files
      const pluginFiles = await workspace.findFiles('**/plugin.json', '**/node_modules/**');
      for (const pluginUri of pluginFiles) {
        const rootPath = path.dirname(pluginUri.fsPath);
        if (seenRoots.has(rootPath)) continue;

        try {
          const raw = await workspace.fs.readFile(pluginUri);
          const text = new TextDecoder().decode(raw);
          const json = JSON.parse(text) as { type?: string };

          if (json.type && WOS_PLUGIN_TYPES.has(json.type)) {
            seenRoots.add(rootPath);
            const project: ProjectInfo = {
              rootUri: Uri.file(rootPath),
              markerUri: undefined,
              projectType: 'wos-plugin',
              vemlFileCount: 0,
            };
            projects.push(project);
            this._onDidDiscoverProject.fire(project);
          }
        } catch {
          // Malformed plugin.json — skip silently
        }
      }
    } catch {
      // findFiles or other workspace API failure — return what we have
    }

    return projects;
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }
}

