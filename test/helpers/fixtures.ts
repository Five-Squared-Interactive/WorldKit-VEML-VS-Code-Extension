/**
 * Shared fixture loading utilities for tests.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Load a VEML fixture file from syntaxes/__fixtures__/.
 */
export function loadVemlFixture(name: string): string {
  return fs.readFileSync(
    path.join(PROJECT_ROOT, `syntaxes/__fixtures__/${name}`),
    'utf8',
  );
}

/** Minimal valid VEML 3.0 document. */
export const MINIMAL_VEML = '<veml><metadata><title>Test</title></metadata><environment><background><color /></background></environment></veml>';

/** VEML with sibling entities for path disambiguation testing. */
export const SIBLING_ENTITIES_VEML =
  '<veml><metadata><title>Test</title></metadata><environment><background><color /></background><mesh id="a"></mesh><mesh id="b"></mesh></environment></veml>';

/** VEML with deeply nested entities and transforms. */
export const DEEP_NESTING_VEML =
  '<veml><metadata><title>Test</title></metadata><environment><background><color /></background><mesh id="p"><scaletransform><position x="0" y="0" z="0" /></scaletransform></mesh></environment></veml>';

/** Malformed VEML with mismatched closing tag. */
export const MISMATCHED_CLOSE_VEML = '<veml><mesh></meh></veml>';
