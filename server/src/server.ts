import {
  CompletionItemKind,
  createConnection,
  DidChangeWatchedFilesParams,
  FileChangeType,
  InitializeParams,
  InitializeResult,
  InsertTextFormat,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import type { CompletionItem as LspCompletionItem } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseVeml } from './vemlParser.js';
import { validateDocument } from './vemlValidator.js';
import { toLspDiagnostic } from '../../shared/src/index.js';
import type { VemlDocument } from '../../shared/src/index.js';
import { LspNotifications, LspRequests } from '../../shared/src/constants.js';
import { getCompletionContext } from './completionContext.js';
import { handleCompletion } from './completionProvider.js';
import type { CompletionItem } from './completionProvider.js';
import { EntityIndex } from './entityIndex.js';
import { ScriptIndex } from './scriptIndex.js';
import { handleDefinition } from './definitionProvider.js';
import { handleReferences } from './referenceProvider.js';
import { handleHover } from './hoverProvider.js';
import { formatDocument } from './formattingProvider.js';
import { getSceneHierarchy } from './sceneHierarchyProvider.js';
import { validateAllDocuments } from './validateAllHandler.js';
import { queryEntities } from './queryEntitiesHandler.js';
import { resolveEntityReference } from './resolveEntityReferenceHandler.js';
import { sourceRangeToLspRange } from './lspUtils.js';
import { validateJsFile } from './jsValidator.js';
import type { JsDiagnostic } from './jsValidator.js';
import { VirtualDocService } from './virtualDocService.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

/** In-memory cache of parsed VEML documents keyed by document URI. */
const parsedDocuments = new Map<string, VemlDocument>();

/** Cross-file entity index for go-to-definition and find-all-references. */
const entityIndex = new EntityIndex();

/** Cross-file script reference index for VEML ↔ JS navigation. */
const scriptIndex = new ScriptIndex();

/** Inline script extraction and offset mapping. */
const virtualDocService = new VirtualDocService();

/** Per-URI debounce timers for validation. */
const validationTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Per-URI debounce timers for scene change notifications. */
const sceneChangeTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Per-URI debounce timers for JS validation. */
const jsValidationTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Known project roots reported from the client. */
const projectRoots = new Set<string>();

/** Count of tracked .veml file URIs. */
let trackedVemlFileCount = 0;

function scheduleValidation(uri: string, doc: VemlDocument): void {
  const existing = validationTimers.get(uri);
  if (existing) clearTimeout(existing);
  validationTimers.set(uri, setTimeout(() => {
    validationTimers.delete(uri);
    const start = Date.now();
    const vemlDiagnostics = validateDocument(doc, entityIndex);
    const lspDiags = vemlDiagnostics.map(toLspDiagnostic);

    // Validate inline <script> blocks
    let inlineScriptCount = 0;
    try {
      const inlineScripts = virtualDocService.getInlineScripts(uri);
      inlineScriptCount = inlineScripts.length;
      const textDoc = documents.get(uri);
      for (const block of inlineScripts) {
        const jsDiags = validateJsFile(block.text, uri);
        for (const jd of jsDiags) {
          lspDiags.push(remapInlineJsDiag(jd, block.vemlOffset, textDoc));
        }
      }
    } catch (err) {
      connection.console.error(`[validator] Inline script validation failed for ${uri}: ${err}`);
    }

    const elapsed = Date.now() - start;
    connection.console.log(
      `[validator] Validated ${uri} in ${elapsed}ms (${lspDiags.length} diagnostics, ${inlineScriptCount} inline scripts)`,
    );
    connection.sendDiagnostics({ uri, diagnostics: lspDiags });
  }, 200));
}

/** Remap a JS diagnostic from JS-local offsets to VEML document positions. */
function remapInlineJsDiag(
  diag: JsDiagnostic,
  vemlOffset: number,
  textDoc: TextDocument | undefined,
): import('vscode-languageserver/node').Diagnostic {
  const severityMap: Record<string, import('vscode-languageserver/node').DiagnosticSeverity> = {
    error: 1, warning: 2, info: 3, hint: 4,
  };

  let startPos = { line: 0, character: 0 };
  let endPos = { line: 0, character: 0 };

  if (textDoc) {
    startPos = textDoc.positionAt(vemlOffset + diag.range.start.offset);
    endPos = textDoc.positionAt(vemlOffset + diag.range.end.offset);
  }

  return {
    range: { start: startPos, end: endPos },
    severity: severityMap[diag.severity],
    code: diag.code,
    source: diag.source,
    message: diag.message,
  };
}

function scheduleSceneChangeNotification(uri: string, changeType: 'added' | 'changed' | 'removed' = 'changed'): void {
  const existing = sceneChangeTimers.get(uri);
  if (existing) clearTimeout(existing);
  sceneChangeTimers.set(uri, setTimeout(() => {
    sceneChangeTimers.delete(uri);
    connection.sendNotification(LspNotifications.sceneDidChange, { uri, changeType });
  }, 500));
}

function scheduleJsValidation(uri: string, text: string): void {
  const existing = jsValidationTimers.get(uri);
  if (existing) clearTimeout(existing);
  jsValidationTimers.set(uri, setTimeout(() => {
    jsValidationTimers.delete(uri);
    const start = Date.now();
    const jsDiags = validateJsFile(text, uri);
    const elapsed = Date.now() - start;
    connection.console.log(
      `[jsValidator] Validated ${uri} in ${elapsed}ms (${jsDiags.length} diagnostics)`,
    );
    connection.sendDiagnostics({ uri, diagnostics: jsDiags.map(jsDiagToLsp) });
  }, 300));
}

/** Convert JsDiagnostic to LSP Diagnostic. */
function jsDiagToLsp(diag: JsDiagnostic): import('vscode-languageserver/node').Diagnostic {
  const severityMap: Record<string, import('vscode-languageserver/node').DiagnosticSeverity> = {
    error: 1, warning: 2, info: 3, hint: 4,
  };
  return {
    range: {
      start: { line: diag.range.start.line - 1, character: diag.range.start.column },
      end: { line: diag.range.end.line - 1, character: diag.range.end.column },
    },
    severity: severityMap[diag.severity],
    code: diag.code,
    source: diag.source,
    message: diag.message,
  };
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.log('[server] Initializing WorldKit VEML language server');

  // Populate project roots from workspace folders
  if (params.workspaceFolders) {
    for (const folder of params.workspaceFolders) {
      projectRoots.add(folder.uri);
    }
  } else if (params.rootUri) {
    projectRoots.add(params.rootUri);
  }

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['<', ' ', '"'],
      },
      definitionProvider: true,
      referencesProvider: true,
      hoverProvider: true,
      documentFormattingProvider: true,
    },
  };
});

connection.onInitialized(() => {
  connection.console.log('[server] WorldKit VEML language server ready');

  // Send project index ready after initial document events settle
  const scanStart = Date.now();
  setTimeout(() => {
    const elapsed = Date.now() - scanStart;
    connection.console.log(
      `[server] Project roots: [${[...projectRoots].join(', ')}], VEML files tracked: ${trackedVemlFileCount}`,
    );
    connection.sendNotification(LspNotifications.projectIndexReady, {
      projectRoots: [...projectRoots],
      vemlFileCount: trackedVemlFileCount,
      elapsedMs: elapsed,
    });
  }, 100);
});

// Track .veml file additions/removals from watched files
connection.onDidChangeWatchedFiles((params: DidChangeWatchedFilesParams) => {
  for (const change of params.changes) {
    const uri = change.uri;
    if (uri.endsWith('.veml')) {
      if (change.type === FileChangeType.Created) {
        trackedVemlFileCount++;
        connection.console.log(`[server] VEML file added: ${uri} (total: ${trackedVemlFileCount})`);
        scheduleSceneChangeNotification(uri, 'added');
      } else if (change.type === FileChangeType.Deleted) {
        trackedVemlFileCount = Math.max(0, trackedVemlFileCount - 1);
        parsedDocuments.delete(uri);
        entityIndex.removeDocument(uri);
        scriptIndex.removeDocument(uri);
        virtualDocService.removeDocument(uri);
        connection.console.log(`[server] VEML file removed: ${uri} (total: ${trackedVemlFileCount})`);
        scheduleSceneChangeNotification(uri, 'removed');
      }
    }
  }
});

documents.onDidChangeContent((change) => {
  const uri = change.document.uri;
  const text = change.document.getText();
  const start = Date.now();
  const languageId = change.document.languageId;

  // Index and validate JS files
  if (languageId === 'javascript') {
    scriptIndex.indexJsFile(uri, text);
    scheduleJsValidation(uri, text);
    connection.console.log(`[scriptIndex] Indexed JS file ${uri}`);
    return;
  }

  try {
    const doc = parseVeml(text);
    parsedDocuments.set(uri, doc);

    // Re-index entity definitions and references (removeDocument is called internally)
    entityIndex.indexDocument(uri, doc);
    scriptIndex.indexDocument(uri, doc, text);
    virtualDocService.indexDocument(uri, doc, text);

    const nodeCount = countNodes(doc);
    const elapsed = Date.now() - start;
    connection.console.log(
      `[parser] Parsed ${uri} in ${elapsed}ms (${nodeCount} nodes, ${entityIndex.getDefinitionCount()} defs, ${entityIndex.getReferenceCount()} refs)`,
    );
    scheduleValidation(uri, doc);
    scheduleSceneChangeNotification(uri);
  } catch (err) {
    connection.console.error(`[parser] Failed to parse ${uri}: ${err}`);
  }
});

documents.onDidClose((event) => {
  const uri = event.document.uri;
  const languageId = event.document.languageId;

  if (languageId === 'javascript') {
    scriptIndex.removeJsFile(uri);
    const jsTimer = jsValidationTimers.get(uri);
    if (jsTimer) {
      clearTimeout(jsTimer);
      jsValidationTimers.delete(uri);
    }
    connection.sendDiagnostics({ uri, diagnostics: [] });
    return;
  }

  parsedDocuments.delete(uri);
  entityIndex.removeDocument(uri);
  scriptIndex.removeDocument(uri);
  virtualDocService.removeDocument(uri);
  const timer = validationTimers.get(uri);
  if (timer) {
    clearTimeout(timer);
    validationTimers.delete(uri);
  }
  const sceneTimer = sceneChangeTimers.get(uri);
  if (sceneTimer) {
    clearTimeout(sceneTimer);
    sceneChangeTimers.delete(uri);
  }
  connection.sendDiagnostics({ uri, diagnostics: [] });
});

function countNodes(doc: VemlDocument): number {
  let count = 0;
  function walk(node: VemlDocument['root']) {
    if (!node) return;
    count++;
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(doc.root);
  return count;
}

// ── Completion handler ───────────────────────────────────────────────

/** Map CompletionItem.kind to LSP CompletionItemKind. */
function toLspCompletionKind(kind: CompletionItem['kind']): CompletionItemKind {
  switch (kind) {
    case 'element': return CompletionItemKind.Class;
    case 'property': return CompletionItemKind.Property;
    case 'enum': return CompletionItemKind.EnumMember;
    case 'value': return CompletionItemKind.Value;
  }
}

connection.onCompletion((params) => {
  const start = Date.now();
  const uri = params.textDocument.uri;
  const doc = documents.get(uri);
  if (!doc) return [];

  const text = doc.getText();
  const offset = doc.offsetAt(params.position);

  const ctx = getCompletionContext(text, offset);
  if (ctx.kind === 'none') return [];

  // Collect existing attributes from the current tag to filter duplicates
  let existingAttributes: string[] | undefined;
  if (ctx.kind === 'attributeName') {
    existingAttributes = findExistingAttributes(text, offset);
  }

  const items = handleCompletion(ctx, { existingAttributes, scriptIndex, vemlUri: uri });
  const elapsed = Date.now() - start;
  connection.console.log(
    `[completion] Completed in ${elapsed}ms (${items.length} items) for ${uri}`,
  );

  return items.map((item): LspCompletionItem => ({
    label: item.label,
    kind: toLspCompletionKind(item.kind),
    detail: item.detail,
    documentation: item.documentation,
    insertText: item.insertText,
    insertTextFormat: item.insertTextFormat === 'snippet' ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
    sortText: item.sortText,
  }));
});

/**
 * Extract existing attribute names from the current tag by text scanning.
 */
function findExistingAttributes(text: string, offset: number): string[] {
  // Find the '<' of the current tag
  let tagStart = -1;
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === '>') break;
    if (text[i] === '<') { tagStart = i; break; }
  }
  if (tagStart === -1) return [];

  const tagText = text.slice(tagStart, offset);
  const attrPattern = /\s+([a-zA-Z_][\w.-]*)\s*=/g;
  const attrs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(tagText)) !== null) {
    attrs.push(match[1]);
  }
  return attrs;
}

// ── Definition handler ─────────────────────────────────────────────���──

connection.onDefinition((params) => {
  const start = Date.now();
  const uri = params.textDocument.uri;
  const doc = documents.get(uri);
  if (!doc) return null;

  const parsed = parsedDocuments.get(uri);
  if (!parsed) return null;

  const offset = doc.offsetAt(params.position);
  const result = handleDefinition(parsed, offset, entityIndex, uri);
  const elapsed = Date.now() - start;

  if (result) {
    connection.console.log(`[definition] Resolved in ${elapsed}ms for ${uri}`);
    return {
      uri: result.uri,
      range: sourceRangeToLspRange(result.range),
    };
  }

  connection.console.log(`[definition] No definition found in ${elapsed}ms for ${uri}`);
  return null;
});

// ── References handler ───────────────────────────────────────────────

connection.onReferences((params) => {
  const start = Date.now();
  const uri = params.textDocument.uri;
  const doc = documents.get(uri);
  if (!doc) return [];

  const parsed = parsedDocuments.get(uri);
  if (!parsed) return [];

  const offset = doc.offsetAt(params.position);
  const results = handleReferences(parsed, offset, entityIndex, params.context.includeDeclaration);
  const elapsed = Date.now() - start;
  connection.console.log(
    `[references] Found ${results.length} references in ${elapsed}ms for ${uri}`,
  );

  return results.map((loc) => ({
    uri: loc.uri,
    range: sourceRangeToLspRange(loc.range),
  }));
});

// ── Hover handler ─────────────────────────────────────────────────────

connection.onHover((params) => {
  const start = Date.now();
  const uri = params.textDocument.uri;
  const doc = documents.get(uri);
  if (!doc) return null;

  const parsed = parsedDocuments.get(uri);
  if (!parsed) return null;

  const offset = doc.offsetAt(params.position);
  const result = handleHover(parsed, offset);
  const elapsed = Date.now() - start;

  if (result) {
    connection.console.log(`[hover] Found hover in ${elapsed}ms for ${uri}`);
    return {
      contents: { kind: 'markdown' as const, value: result.contents },
      range: sourceRangeToLspRange(result.range),
    };
  }

  connection.console.log(`[hover] No hover found in ${elapsed}ms for ${uri}`);
  return null;
});

// ── Formatting handler ────────────────────────────────────────────────

connection.onDocumentFormatting((params) => {
  const start = Date.now();
  const uri = params.textDocument.uri;
  const doc = documents.get(uri);
  if (!doc) return [];

  const parsed = parsedDocuments.get(uri);
  if (!parsed) return [];

  const edits = formatDocument(parsed, {
    tabSize: params.options.tabSize,
    insertSpaces: params.options.insertSpaces,
  });
  const elapsed = Date.now() - start;
  connection.console.log(
    `[formatting] Formatted ${uri} in ${elapsed}ms (${edits.length} edits)`,
  );

  return edits;
});

// ── Scene hierarchy handler ────────────────────────────────────────────

connection.onRequest(LspRequests.getSceneHierarchy, (params: { uri: string }) => {
  const start = Date.now();
  const uri = params.uri;
  const doc = parsedDocuments.get(uri);
  if (!doc?.root) return [];

  const result = getSceneHierarchy(doc);
  const elapsed = Date.now() - start;
  connection.console.log(
    `[sceneHierarchy] Built hierarchy for ${uri} in ${elapsed}ms (${result.length} top-level nodes)`,
  );
  return result;
});

// ── Query Entities handler ────────────────────────────────────────────

connection.onRequest(LspRequests.queryEntities, (params?: { filter?: { type?: string; idPrefix?: string } }) => {
  const start = Date.now();
  const result = queryEntities(entityIndex, params?.filter);
  const elapsed = Date.now() - start;
  connection.console.log(
    `[queryEntities] Returned ${result.length} entities in ${elapsed}ms`,
  );
  return result;
});

// ── Resolve Entity Reference handler ──────────────────────────────────

connection.onRequest(LspRequests.resolveEntityReference, (params: { entityId: string }) => {
  const start = Date.now();
  const result = resolveEntityReference(entityIndex, params.entityId);
  const elapsed = Date.now() - start;

  if (!result) {
    connection.console.log(
      `[resolveEntityReference] No definition for "${params.entityId}" (${elapsed}ms)`,
    );
    return undefined;
  }

  connection.console.log(
    `[resolveEntityReference] Resolved "${params.entityId}" in ${elapsed}ms`,
  );
  return result;
});

// ── Validate All handler ──────────────────────────────────────────────

connection.onRequest(LspRequests.validateAll, () => {
  const start = Date.now();
  const result = validateAllDocuments(parsedDocuments, entityIndex);

  // Publish diagnostics per file
  for (const r of result.results) {
    connection.sendDiagnostics({ uri: r.uri, diagnostics: r.diagnostics.map(toLspDiagnostic) });
  }

  const elapsed = Date.now() - start;
  connection.console.log(
    `[validateAll] Validated ${result.totalFiles} file(s) in ${elapsed}ms (${result.totalDiagnostics} diagnostics)`,
  );
  return { totalFiles: result.totalFiles, totalDiagnostics: result.totalDiagnostics };
});

documents.listen(connection);
connection.listen();
