/**
 * Pure function for project scaffolding — resolves template placeholders.
 * No file I/O, no VS Code API. This is a pure transform.
 */

import type { ScaffoldTemplate, ScaffoldFile } from './templates.js';

/**
 * Resolve template placeholders and return the final file list.
 * Replaces all `{{projectName}}` occurrences in file content.
 */
export function scaffoldProject(
  template: ScaffoldTemplate,
  projectName: string,
): ScaffoldFile[] {
  if (!projectName) {
    throw new Error('projectName must be a non-empty string');
  }
  return template.files.map((file) => ({
    relativePath: file.relativePath,
    content: file.content.replaceAll('{{projectName}}', projectName),
  }));
}
