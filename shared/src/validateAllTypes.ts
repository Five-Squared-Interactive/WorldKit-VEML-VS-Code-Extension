import type { VemlDiagnostic } from './diagnostics.js';

/** Result from validating all VEML documents in the workspace. */
export interface ValidateAllResult {
  /** Per-file validation results. */
  readonly results: ReadonlyArray<{
    readonly uri: string;
    readonly diagnostics: readonly VemlDiagnostic[];
  }>;
  /** Total number of files validated. */
  readonly totalFiles: number;
  /** Total number of diagnostics across all files. */
  readonly totalDiagnostics: number;
}
