import { describe, it, expect } from 'vitest';
import { parseVeml } from '../../../server/src/vemlParser.js';
import { validateDocument } from '../../../server/src/vemlValidator.js';
import { ALL_TEMPLATES } from './templates.js';

describe('scaffold templates', () => {
  it('has 4 templates', () => {
    expect(ALL_TEMPLATES).toHaveLength(4);
  });

  it('has unique template IDs', () => {
    const ids = ALL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique template labels', () => {
    const labels = ALL_TEMPLATES.map((t) => t.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  describe.each(ALL_TEMPLATES)('$label', (template) => {
    it('includes .vemlproject marker', () => {
      const marker = template.files.find((f) => f.relativePath === '.vemlproject');
      expect(marker).toBeDefined();
    });

    it('includes .vscode/settings.json', () => {
      const settings = template.files.find((f) => f.relativePath === '.vscode/settings.json');
      expect(settings).toBeDefined();
      const parsed = JSON.parse(settings!.content);
      expect(parsed['files.associations']['*.veml']).toBe('veml');
    });

    it('includes at least one .veml file', () => {
      const vemlFiles = template.files.filter((f) => f.relativePath.endsWith('.veml'));
      expect(vemlFiles.length).toBeGreaterThan(0);
    });

    const vemlFiles = template.files.filter((f) => f.relativePath.endsWith('.veml'));

    it('has VEML files to validate', () => {
      expect(vemlFiles.length).toBeGreaterThan(0);
    });

    it.each(vemlFiles)('$relativePath parses without errors', (file) => {
      // Replace placeholder with a valid name before parsing
      const content = file.content.replaceAll('{{projectName}}', 'test-project');
      const doc = parseVeml(content);
      expect(doc.errors).toHaveLength(0);
    });

    it.each(vemlFiles)('$relativePath validates without diagnostics', (file) => {
      const content = file.content.replaceAll('{{projectName}}', 'test-project');
      const doc = parseVeml(content);
      const diagnostics = validateDocument(doc);
      expect(diagnostics).toHaveLength(0);
    });
  });

  it('plugin-test template includes valid plugin.json', () => {
    const pluginTemplate = ALL_TEMPLATES.find((t) => t.id === 'plugin-test');
    expect(pluginTemplate).toBeDefined();
    const pluginFile = pluginTemplate!.files.find((f) => f.relativePath === 'plugin.json');
    expect(pluginFile).toBeDefined();
    const parsed = JSON.parse(pluginFile!.content);
    expect(parsed.type).toBe('wos-plugin');
    expect(parsed.name).toBe('{{projectName}}');
  });

  it('interactive template includes behavior stub', () => {
    const template = ALL_TEMPLATES.find((t) => t.id === 'interactive');
    expect(template).toBeDefined();
    const behaviorFile = template!.files.find((f) => f.relativePath.endsWith('.js'));
    expect(behaviorFile).toBeDefined();
  });

  it('multi-room template includes behavior stub', () => {
    const template = ALL_TEMPLATES.find((t) => t.id === 'multi-room');
    expect(template).toBeDefined();
    const behaviorFile = template!.files.find((f) => f.relativePath.endsWith('.js'));
    expect(behaviorFile).toBeDefined();
  });
});
