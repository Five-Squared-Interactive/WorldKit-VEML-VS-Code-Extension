import { describe, it, expect } from 'vitest';
import {
  EXTENSION_ID,
  EXTENSION_DISPLAY_NAME,
  VEML_LANGUAGE_ID,
  VEML_FILE_EXTENSION,
  PROJECT_MARKER_FILE,
  OUTPUT_CHANNEL_NAME,
  Commands,
  Views,
  ContextKeys,
  LspNotifications,
  LspRequests,
} from './constants.js';

describe('constants', () => {
  it('has correct extension ID', () => {
    expect(EXTENSION_ID).toBe('worldkit-vscode');
  });

  it('has correct display name', () => {
    expect(EXTENSION_DISPLAY_NAME).toBe('WorldKit VEML');
  });

  it('has correct VEML language ID', () => {
    expect(VEML_LANGUAGE_ID).toBe('veml');
  });

  it('has correct VEML file extension', () => {
    expect(VEML_FILE_EXTENSION).toBe('.veml');
  });

  it('has correct project marker file', () => {
    expect(PROJECT_MARKER_FILE).toBe('.vemlproject');
  });

  it('has correct output channel name', () => {
    expect(OUTPUT_CHANNEL_NAME).toBe('WorldKit VEML');
  });

  describe('Commands', () => {
    it('follows worldkit-vscode.commandName format', () => {
      for (const value of Object.values(Commands)) {
        expect(value).toMatch(/^worldkit-vscode\./);
      }
    });

    it('has expected commands', () => {
      expect(Commands.validateAll).toBe('worldkit-vscode.validateAll');
      expect(Commands.showSceneOutline).toBe('worldkit-vscode.showSceneOutline');
      expect(Commands.newWorldProject).toBe('worldkit-vscode.newWorldProject');
    });
  });

  describe('Views', () => {
    it('follows worldkit-vscode.viewName format', () => {
      for (const value of Object.values(Views)) {
        expect(value).toMatch(/^worldkit-vscode\./);
      }
    });

    it('has scene outline view', () => {
      expect(Views.sceneOutline).toBe('worldkit-vscode.sceneOutline');
    });
  });

  describe('ContextKeys', () => {
    it('follows worldkit-vscode:contextKey format (colon separator)', () => {
      for (const value of Object.values(ContextKeys)) {
        expect(value).toMatch(/^worldkit-vscode:/);
      }
    });
  });

  describe('LspNotifications', () => {
    it('follows worldkit/notificationName format', () => {
      for (const value of Object.values(LspNotifications)) {
        expect(value).toMatch(/^worldkit\//);
      }
    });
  });

  describe('LspRequests', () => {
    it('follows worldkit/requestName format', () => {
      for (const value of Object.values(LspRequests)) {
        expect(value).toMatch(/^worldkit\//);
      }
    });
  });
});
