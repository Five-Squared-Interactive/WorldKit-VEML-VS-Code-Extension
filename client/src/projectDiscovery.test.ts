import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Uri, FileSystemWatcher, Disposable } from 'vscode';
// Constants used by the production code under test
// import { PROJECT_MARKER_FILE, ContextKeys } from '../../shared/src/constants.js';

// ── Mock VS Code API ────────────────────────────────────────────────────────

const mockFindFiles = vi.fn<(pattern: unknown, ...args: unknown[]) => Promise<Uri[]>>();
const mockCreateFileSystemWatcher = vi.fn<(...args: unknown[]) => FileSystemWatcher>();
const mockExecuteCommand = vi.fn<(...args: unknown[]) => Promise<void>>();
const mockIsTrusted = vi.fn(() => true);

const mockOnDidGrantWorkspaceTrust = vi.fn((_cb: () => void): Disposable => ({ dispose: vi.fn() }));

const mockWorkspaceFolders: Array<{ uri: { fsPath: string }; name: string; index: number }> = [];

vi.mock('vscode', () => ({
  workspace: {
    findFiles: (...args: unknown[]) => mockFindFiles(...args),
    createFileSystemWatcher: (...args: unknown[]) => mockCreateFileSystemWatcher(...args),
    get isTrusted() {
      return mockIsTrusted();
    },
    onDidGrantWorkspaceTrust: (cb: () => void) => mockOnDidGrantWorkspaceTrust(cb),
    get workspaceFolders() {
      return mockWorkspaceFolders.length > 0 ? mockWorkspaceFolders : undefined;
    },
    fs: {
      readFile: vi.fn(),
    },
  },
  commands: {
    executeCommand: (...args: unknown[]) => mockExecuteCommand(...args),
  },
  Uri: {
    file: (path: string) => ({ fsPath: path, toString: () => `file://${path}`, scheme: 'file', path }),
    parse: (str: string) => ({ fsPath: str, toString: () => str, scheme: 'file', path: str }),
  },
  EventEmitter: class MockEventEmitter {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  },
  RelativePattern: vi.fn().mockImplementation((base: unknown, pattern: string) => ({
    base,
    pattern,
  })),
}));

// We must import AFTER mock setup
import { ProjectDiscovery } from './projectDiscovery.js';
import type { ProjectInfo } from './projectDiscovery.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fakeUri(filePath: string): Uri {
  return {
    fsPath: filePath,
    toString: () => `file://${filePath}`,
    scheme: 'file',
    path: filePath,
  } as unknown as Uri;
}

function fakeWatcher(): FileSystemWatcher {
  return {
    onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
    onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
    ignoreCreateEvents: false,
    ignoreChangeEvents: false,
    ignoreDeleteEvents: false,
  } as unknown as FileSystemWatcher;
}

describe('ProjectDiscovery', () => {
  let discovery: ProjectDiscovery;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFileSystemWatcher.mockReturnValue(fakeWatcher());
    mockWorkspaceFolders.length = 0;
    discovery = new ProjectDiscovery();
  });

  afterEach(() => {
    discovery.dispose();
  });

  // ── 1.2 discoverProjects: .vemlproject marker detection ────────────────

  describe('discoverProjects — .vemlproject marker', () => {
    it('discovers project from .vemlproject marker file (AC #1)', async () => {
      const markerUri = fakeUri('/workspace/myproject/.vemlproject');
      mockFindFiles
        .mockResolvedValueOnce([markerUri])   // .vemlproject search
        .mockResolvedValueOnce([])             // .veml search
        .mockResolvedValueOnce([]);            // plugin.json search

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].projectType).toBe('vemlproject');
      expect(projects[0].rootUri.fsPath).toBe('/workspace/myproject');
      expect(projects[0].markerUri?.fsPath).toBe('/workspace/myproject/.vemlproject');
    });

    it('discovers multiple .vemlproject markers', async () => {
      const marker1 = fakeUri('/workspace/proj1/.vemlproject');
      const marker2 = fakeUri('/workspace/proj2/.vemlproject');
      mockFindFiles
        .mockResolvedValueOnce([marker1, marker2])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0].projectType).toBe('vemlproject');
      expect(projects[1].projectType).toBe('vemlproject');
    });
  });

  // ── 1.3 discoverProjects: .veml file fallback ─────────────────────────

  describe('discoverProjects — .veml file fallback (AC #2)', () => {
    it('falls back to workspace root when .veml files found but no marker', async () => {
      mockWorkspaceFolders.push({
        uri: { fsPath: '/workspace' },
        name: 'workspace',
        index: 0,
      });
      const vemlFile1 = fakeUri('/workspace/scenes/world.veml');
      const vemlFile2 = fakeUri('/workspace/scenes/other.veml');
      mockFindFiles
        .mockResolvedValueOnce([])                     // no .vemlproject
        .mockResolvedValueOnce([vemlFile1, vemlFile2]) // .veml files found
        .mockResolvedValueOnce([]);                    // no plugin.json

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].projectType).toBe('veml-files');
      expect(projects[0].rootUri.fsPath).toBe('/workspace');
      expect(projects[0].markerUri).toBeUndefined();
      expect(projects[0].vemlFileCount).toBe(2);
    });
  });

  // ── 1.4 discoverProjects: WorldOS plugin detection ────────────────────

  describe('discoverProjects — WorldOS plugin detection (AC #3)', () => {
    it('detects WorldOS plugin project from plugin.json with wos-plugin type', async () => {
      const pluginJsonUri = fakeUri('/workspace/myplugin/plugin.json');
      const pluginJsonContent = JSON.stringify({ type: 'wos-plugin', name: 'test-plugin' });
      const { workspace } = await import('vscode');
      (workspace.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new TextEncoder().encode(pluginJsonContent),
      );

      mockFindFiles
        .mockResolvedValueOnce([])            // no .vemlproject
        .mockResolvedValueOnce([])            // no .veml files
        .mockResolvedValueOnce([pluginJsonUri]); // plugin.json found

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].projectType).toBe('wos-plugin');
      expect(projects[0].rootUri.fsPath).toBe('/workspace/myplugin');
    });

    it('detects WorldOS plugin project from plugin.json with behavior-plugin type', async () => {
      const pluginJsonUri = fakeUri('/workspace/myplugin/plugin.json');
      const pluginJsonContent = JSON.stringify({ type: 'behavior-plugin', name: 'behavior' });
      const { workspace } = await import('vscode');
      (workspace.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new TextEncoder().encode(pluginJsonContent),
      );

      mockFindFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pluginJsonUri]);

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].projectType).toBe('wos-plugin');
    });

    it('ignores plugin.json without WorldOS type field', async () => {
      const pluginJsonUri = fakeUri('/workspace/myplugin/plugin.json');
      const pluginJsonContent = JSON.stringify({ name: 'unrelated-plugin' });
      const { workspace } = await import('vscode');
      (workspace.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new TextEncoder().encode(pluginJsonContent),
      );

      mockFindFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pluginJsonUri]);

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(0);
    });

    it('ignores plugin.json with unrecognized type value', async () => {
      const pluginJsonUri = fakeUri('/workspace/myplugin/plugin.json');
      const pluginJsonContent = JSON.stringify({ type: 'npm-package', name: 'something' });
      const { workspace } = await import('vscode');
      (workspace.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new TextEncoder().encode(pluginJsonContent),
      );

      mockFindFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pluginJsonUri]);

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(0);
    });
  });

  // ── 1.5 ProjectInfo interface ─────────────────────────────────────────

  describe('ProjectInfo shape', () => {
    it('has required fields: rootUri, projectType, vemlFileCount', async () => {
      const markerUri = fakeUri('/workspace/.vemlproject');
      mockFindFiles
        .mockResolvedValueOnce([markerUri])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const projects = await discovery.discoverProjects();

      const project: ProjectInfo = projects[0];
      expect(project).toHaveProperty('rootUri');
      expect(project).toHaveProperty('projectType');
      expect(project).toHaveProperty('vemlFileCount');
      expect(['vemlproject', 'veml-files', 'wos-plugin']).toContain(project.projectType);
    });
  });

  // ── AC #4: No project detected ────────────────────────────────────────

  describe('no project scenario (AC #4)', () => {
    it('returns empty array when no VEML files or markers found', async () => {
      mockFindFiles
        .mockResolvedValueOnce([])  // no .vemlproject
        .mockResolvedValueOnce([])  // no .veml
        .mockResolvedValueOnce([]); // no plugin.json

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(0);
    });
  });

  // ── 1.6 Event emission ────────────────────────────────────────────────

  describe('onDidDiscoverProject event', () => {
    it('exposes an onDidDiscoverProject event', () => {
      expect(discovery.onDidDiscoverProject).toBeDefined();
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles findFiles rejection gracefully', async () => {
      mockFindFiles.mockRejectedValueOnce(new Error('Permission denied'));

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(0);
    });

    it('handles malformed plugin.json gracefully', async () => {
      const pluginJsonUri = fakeUri('/workspace/bad/plugin.json');
      const { workspace } = await import('vscode');
      (workspace.fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        new TextEncoder().encode('not valid json{{{'),
      );

      mockFindFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pluginJsonUri]);

      const projects = await discovery.discoverProjects();

      expect(projects).toHaveLength(0);
    });

    it('deduplicates projects with same root', async () => {
      // If both .vemlproject and .veml files exist in same directory
      const markerUri = fakeUri('/workspace/.vemlproject');
      const vemlFile = fakeUri('/workspace/scene.veml');
      mockWorkspaceFolders.push({
        uri: { fsPath: '/workspace' },
        name: 'workspace',
        index: 0,
      });
      mockFindFiles
        .mockResolvedValueOnce([markerUri])
        .mockResolvedValueOnce([vemlFile])
        .mockResolvedValueOnce([]);

      const projects = await discovery.discoverProjects();

      // .vemlproject should take priority — only one project
      expect(projects).toHaveLength(1);
      expect(projects[0].projectType).toBe('vemlproject');
    });
  });

  // ── Multiple workspace folders ──────────────────────────────────────

  describe('multiple workspace folders', () => {
    it('handles multiple workspace folders with veml files', async () => {
      mockWorkspaceFolders.push(
        { uri: { fsPath: '/workspace1' }, name: 'ws1', index: 0 },
        { uri: { fsPath: '/workspace2' }, name: 'ws2', index: 1 },
      );
      const vemlFile = fakeUri('/workspace1/scene.veml');
      mockFindFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([vemlFile])
        .mockResolvedValueOnce([]);

      const projects = await discovery.discoverProjects();

      // Both workspace folders should be detected as veml-files projects
      expect(projects).toHaveLength(2);
      expect(projects.every((p) => p.projectType === 'veml-files')).toBe(true);
    });
  });

  // ── Disposable ────────────────────────────────────────────────────────

  describe('dispose', () => {
    it('implements Disposable', () => {
      expect(typeof discovery.dispose).toBe('function');
      discovery.dispose(); // should not throw
    });
  });

  // ── Performance (Task 5) ──────────────────────────────────────────────

  describe('activation performance (AC #1 — NFR5)', () => {
    it('discovery completes well under 2 seconds', async () => {
      // Simulate workspace with many files
      const markers = Array.from({ length: 5 }, (_, i) =>
        fakeUri(`/workspace/proj${i}/.vemlproject`),
      );
      const vemlFiles = Array.from({ length: 50 }, (_, i) =>
        fakeUri(`/workspace/scenes/world${i}.veml`),
      );
      mockFindFiles
        .mockResolvedValueOnce(markers)
        .mockResolvedValueOnce(vemlFiles)
        .mockResolvedValueOnce([]);

      const start = Date.now();
      const projects = await discovery.discoverProjects();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
      expect(projects.length).toBeGreaterThan(0);
    });
  });
});

// ── Package.json activation events verification (Task 5.3) ──────────────

describe('package.json activation events', () => {
  it('has correct activation events configured', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const pkgPath = resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    expect(pkg.activationEvents).toContain('onLanguage:veml');
    expect(pkg.activationEvents).toContain('workspaceContains:**/*.veml');
    expect(pkg.activationEvents).toContain('workspaceContains:**/.vemlproject');
  });
});
