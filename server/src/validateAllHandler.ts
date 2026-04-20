import type { VemlDocument } from '../../shared/src/index.js';
import type { ValidateAllResult } from '../../shared/src/validateAllTypes.js';
import type { EntityIndex } from './entityIndex.js';
import { validateDocument } from './vemlValidator.js';

/**
 * Validate all parsed VEML documents and return per-file diagnostic results.
 * Pure function — no LSP or VS Code dependencies.
 */
export function validateAllDocuments(
  parsedDocs: ReadonlyMap<string, VemlDocument>,
  entityIdx: EntityIndex,
): ValidateAllResult {
  const results: ValidateAllResult['results'][number][] = [];
  let totalDiagnostics = 0;

  for (const [uri, doc] of parsedDocs) {
    const diagnostics = validateDocument(doc, entityIdx);
    results.push({ uri, diagnostics });
    totalDiagnostics += diagnostics.length;
  }

  return {
    results,
    totalFiles: results.length,
    totalDiagnostics,
  };
}
