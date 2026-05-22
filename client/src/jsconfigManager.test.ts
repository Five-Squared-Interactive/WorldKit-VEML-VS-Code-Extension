import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  createDirectory: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('vscode', () => {
  const Uri = {
    file: (p: string) => ({ fsPath: p, toString: () => `file://${p}` }),
    joinPath: (base: any, ...segments: string[]) => {
      const joined = [base.fsPath, ...segments].join('/');
      return { fsPath: joined, toString: () => `file://${joined}` };
    },
  };
  return {
    Uri,
    workspace: {
      workspaceFolders: [{ uri: Uri.file('/project') }],
      fs: {
        readFile: mocks.readFile,
        writeFile: mocks.writeFile,
        createDirectory: mocks.createDirectory,
        stat: mocks.stat,
      },
    },
  };
});

import { JsconfigManager } from './jsconfigManager.js';

function makeContext(): any {
  return {
    asAbsolutePath: (rel: string) => `/ext/${rel}`,
  };
}

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Normalize path for cross-platform matching */
function normPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function findWriteCall(needle: string): any[] | undefined {
  return mocks.writeFile.mock.calls.find(
    (call: any[]) => normPath(call[0].fsPath).includes(needle),
  );
}

const BUNDLED_TYPES = '// WebVerse API Types v0.1.0 — generated from JavascriptHandler.cs\ndeclare class Vector3 {}';

function pathMatches(fsPath: string, needle: string): boolean {
  return normPath(fsPath).includes(needle);
}

describe('JsconfigManager', () => {
  let outputLines: string[];
  let outputChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    outputLines = [];
    outputChannel = {
      appendLine: (line: string) => outputLines.push(line),
    };
  });

  describe('fresh project — no existing config', () => {
    it('creates jsconfig.json and deploys types', async () => {
      mocks.readFile.mockImplementation((uri: any) => {
        if (pathMatches(uri.fsPath, 'ext/types')) return Promise.resolve(encode(BUNDLED_TYPES));
        throw new Error('File not found');
      });
      mocks.stat.mockRejectedValue(new Error('not found'));

      await JsconfigManager.ensureTypes(makeContext(), outputChannel);

      expect(findWriteCall('.worldkit/types/webverse/index.d.ts')).toBeDefined();
      const jsconfigWrite = findWriteCall('jsconfig.json');
      expect(jsconfigWrite).toBeDefined();
      const config = JSON.parse(new TextDecoder().decode(jsconfigWrite![1]));
      expect(config.compilerOptions.checkJs).toBe(true);
      expect(config.include).toContain('**/*.js');
      expect(config.include).toContain('./.worldkit/types/webverse/index.d.ts');
    });
  });

  describe('existing jsconfig.json', () => {
    it('adds types path to include without overwriting user settings', async () => {
      const existingJsconfig = JSON.stringify({
        compilerOptions: { target: 'ES2020' },
        include: ['src/**/*.js'],
      });

      mocks.readFile.mockImplementation((uri: any) => {
        if (pathMatches(uri.fsPath, 'ext/types')) return Promise.resolve(encode(BUNDLED_TYPES));
        if (pathMatches(uri.fsPath, 'jsconfig.json')) return Promise.resolve(encode(existingJsconfig));
        if (pathMatches(uri.fsPath, '.gitignore')) return Promise.resolve(encode('.worldkit/\n'));
        throw new Error('File not found');
      });
      mocks.stat.mockRejectedValue(new Error('not found'));

      await JsconfigManager.ensureTypes(makeContext(), outputChannel);

      const jsconfigWrite = findWriteCall('jsconfig.json');
      expect(jsconfigWrite).toBeDefined();
      const config = JSON.parse(new TextDecoder().decode(jsconfigWrite![1]));
      expect(config.compilerOptions.target).toBe('ES2020');
      expect(config.include).toContain('src/**/*.js');
      expect(config.include).toContain('./.worldkit/types/webverse/index.d.ts');
    });
  });

  describe('tsconfig.json present', () => {
    it('skips jsconfig.json but still deploys types', async () => {
      mocks.readFile.mockImplementation((uri: any) => {
        if (pathMatches(uri.fsPath, 'ext/types')) return Promise.resolve(encode(BUNDLED_TYPES));
        if (pathMatches(uri.fsPath, '.gitignore')) return Promise.resolve(encode('.worldkit/\n'));
        throw new Error('File not found');
      });
      mocks.stat.mockImplementation((uri: any) => {
        if (pathMatches(uri.fsPath, 'tsconfig.json')) return Promise.resolve({ type: 1 });
        throw new Error('not found');
      });

      await JsconfigManager.ensureTypes(makeContext(), outputChannel);

      expect(findWriteCall('.worldkit/types/webverse/index.d.ts')).toBeDefined();
      expect(findWriteCall('jsconfig.json')).toBeUndefined();
      expect(outputLines.some((l) => l.includes('tsconfig.json found'))).toBe(true);
    });
  });

  describe('version check', () => {
    it('skips when version is current', async () => {
      mocks.readFile.mockImplementation((uri: any) => {
        if (pathMatches(uri.fsPath, 'ext/types')) return Promise.resolve(encode(BUNDLED_TYPES));
        if (pathMatches(uri.fsPath, '.worldkit/types/webverse')) return Promise.resolve(encode(BUNDLED_TYPES));
        throw new Error('File not found');
      });
      mocks.stat.mockRejectedValue(new Error('not found'));

      await JsconfigManager.ensureTypes(makeContext(), outputChannel);

      expect(outputLines.some((l) => l.includes('v0.1.0 is current'))).toBe(true);
    });

    it('updates when version is stale', async () => {
      const stale = '// WebVerse API Types v0.0.9 — generated from JavascriptHandler.cs\ndeclare class V {}';

      mocks.readFile.mockImplementation((uri: any) => {
        if (pathMatches(uri.fsPath, 'ext/types')) return Promise.resolve(encode(BUNDLED_TYPES));
        if (pathMatches(uri.fsPath, '.worldkit/types/webverse')) return Promise.resolve(encode(stale));
        if (pathMatches(uri.fsPath, '.gitignore')) return Promise.resolve(encode('.worldkit/\n'));
        throw new Error('File not found');
      });
      mocks.stat.mockRejectedValue(new Error('not found'));

      await JsconfigManager.ensureTypes(makeContext(), outputChannel);

      expect(outputLines.some((l) => l.includes('Updating'))).toBe(true);
    });
  });

  describe('bundled types missing', () => {
    it('skips gracefully', async () => {
      mocks.readFile.mockRejectedValue(new Error('File not found'));

      await JsconfigManager.ensureTypes(makeContext(), outputChannel);

      expect(outputLines.some((l) => l.includes('not found — skipping'))).toBe(true);
      expect(mocks.writeFile).not.toHaveBeenCalled();
    });
  });
});
