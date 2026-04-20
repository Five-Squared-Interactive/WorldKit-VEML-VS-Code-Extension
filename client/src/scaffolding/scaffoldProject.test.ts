import { describe, it, expect } from 'vitest';
import { scaffoldProject } from './scaffoldProject.js';
import { MINIMAL_TEMPLATE, INTERACTIVE_TEMPLATE, ALL_TEMPLATES } from './templates.js';
import { parseVeml } from '../../../server/src/vemlParser.js';
import { validateDocument } from '../../../server/src/vemlValidator.js';

describe('scaffoldProject', () => {
  it('replaces {{projectName}} in file content', () => {
    const files = scaffoldProject(MINIMAL_TEMPLATE, 'my-world');
    const worldFile = files.find((f) => f.relativePath === 'world.veml');
    expect(worldFile).toBeDefined();
    expect(worldFile!.content).toContain('my-world');
    expect(worldFile!.content).not.toContain('{{projectName}}');
  });

  it('preserves file count from template', () => {
    const files = scaffoldProject(MINIMAL_TEMPLATE, 'test');
    expect(files).toHaveLength(MINIMAL_TEMPLATE.files.length);
  });

  it('replaces {{projectName}} in all files', () => {
    const files = scaffoldProject(INTERACTIVE_TEMPLATE, 'cool-world');
    for (const file of files) {
      expect(file.content).not.toContain('{{projectName}}');
    }
  });

  it('handles special characters in project name safely', () => {
    const files = scaffoldProject(MINIMAL_TEMPLATE, 'test-project_v2');
    const worldFile = files.find((f) => f.relativePath === 'world.veml');
    expect(worldFile!.content).toContain('test-project_v2');
  });

  it('throws on empty project name', () => {
    expect(() => scaffoldProject(MINIMAL_TEMPLATE, '')).toThrow('projectName must be a non-empty string');
  });

  it('returns empty array for template with no files', () => {
    const emptyTemplate = { id: 'empty', label: 'Empty', description: '', detail: '', files: [] };
    const files = scaffoldProject(emptyTemplate, 'test');
    expect(files).toHaveLength(0);
  });

  describe('scaffolded VEML validates after placeholder resolution', () => {
    const templates = ALL_TEMPLATES;
    it('has templates to test', () => {
      expect(templates.length).toBeGreaterThan(0);
    });

    it.each(templates)('$label VEML files validate after scaffolding', (template) => {
      const files = scaffoldProject(template, 'scaffold-test');
      const vemlFiles = files.filter((f) => f.relativePath.endsWith('.veml'));
      expect(vemlFiles.length).toBeGreaterThan(0);

      for (const file of vemlFiles) {
        const doc = parseVeml(file.content);
        expect(doc.errors).toHaveLength(0);
        const diagnostics = validateDocument(doc);
        expect(diagnostics).toHaveLength(0);
      }
    });
  });
});
