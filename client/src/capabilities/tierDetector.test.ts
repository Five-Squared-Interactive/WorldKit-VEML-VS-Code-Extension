import { describe, it, expect, vi } from 'vitest';
import { TierDetector } from './tierDetector.js';
import { Tier } from '../../../shared/src/tier.types.js';

const mockWatcherDispose = vi.fn();
const mockEmitterDispose = vi.fn();
const mockOnDidCreate = vi.fn();
const mockOnDidDelete = vi.fn();

vi.mock('vscode', () => {
  const mockEvent = vi.fn();
  return {
    workspace: {
      createFileSystemWatcher: vi.fn(() => ({
        onDidCreate: mockOnDidCreate,
        onDidChange: vi.fn(),
        onDidDelete: mockOnDidDelete,
        dispose: mockWatcherDispose,
      })),
    },
    Disposable: class {},
    EventEmitter: class MockEventEmitter {
      event = mockEvent;
      fire = vi.fn();
      dispose = mockEmitterDispose;
    },
  };
});

import { workspace } from 'vscode';

function createMockOutputChannel(): import('vscode').OutputChannel {
  return { appendLine: vi.fn() } as unknown as import('vscode').OutputChannel;
}

describe('TierDetector', () => {
  it('defaults to Tier.Standalone', () => {
    const detector = new TierDetector(createMockOutputChannel());
    expect(detector.getTier()).toBe(Tier.Standalone);
  });

  it('exposes onDidChangeTier event', () => {
    const detector = new TierDetector(createMockOutputChannel());
    expect(detector.onDidChangeTier).toBeDefined();
  });

  it('creates file system watcher for .worldkit/**', () => {
    new TierDetector(createMockOutputChannel());
    expect(workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/.worldkit/**');
  });

  it('subscribes to watcher onDidCreate and onDidDelete', () => {
    mockOnDidCreate.mockClear();
    mockOnDidDelete.mockClear();

    new TierDetector(createMockOutputChannel());

    expect(mockOnDidCreate).toHaveBeenCalledWith(expect.any(Function));
    expect(mockOnDidDelete).toHaveBeenCalledWith(expect.any(Function));
  });

  it('dispose cleans up watcher and event emitter', () => {
    mockWatcherDispose.mockClear();
    mockEmitterDispose.mockClear();

    const detector = new TierDetector(createMockOutputChannel());
    detector.dispose();

    expect(mockWatcherDispose).toHaveBeenCalled();
    expect(mockEmitterDispose).toHaveBeenCalled();
  });
});
