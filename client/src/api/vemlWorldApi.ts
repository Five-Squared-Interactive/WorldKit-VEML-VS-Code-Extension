/**
 * Client-side implementation of VemlWorldApi.
 * Delegates to the language server via LSP custom requests.
 */

import type { LanguageClient } from 'vscode-languageclient/node';
import type {
  VemlWorldApi,
  EntityInfo,
  EntityQueryFilter,
  WorldChangeEvent,
} from '../../../shared/src/apiTypes.js';
import type { SceneNode } from '../../../shared/src/sceneTypes.js';
import { LspRequests, LspNotifications } from '../../../shared/src/constants.js';

const API_VERSION = '0.1.0';

/**
 * Create a VemlWorldApi backed by a running LanguageClient.
 * All methods return graceful empty/undefined results if the server request fails.
 */
export function createVemlWorldApi(client: LanguageClient): VemlWorldApi {
  return {
    version: API_VERSION,

    async queryEntities(filter?: EntityQueryFilter): Promise<ReadonlyArray<EntityInfo>> {
      try {
        return await client.sendRequest<EntityInfo[]>(
          LspRequests.queryEntities,
          filter ? { filter } : undefined,
        );
      } catch {
        return [];
      }
    },

    async resolveReference(entityId: string): Promise<EntityInfo | undefined> {
      try {
        return await client.sendRequest<EntityInfo | undefined>(
          LspRequests.resolveEntityReference,
          { entityId },
        );
      } catch {
        return undefined;
      }
    },

    async getSceneHierarchy(uri: string): Promise<ReadonlyArray<SceneNode>> {
      try {
        return await client.sendRequest<SceneNode[]>(
          LspRequests.getSceneHierarchy,
          { uri },
        );
      } catch {
        return [];
      }
    },

    onDidChangeWorld(listener: (event: WorldChangeEvent) => void): { dispose(): void } {
      const disposable = client.onNotification(
        LspNotifications.sceneDidChange,
        (params: { uri: string; changeType?: 'added' | 'changed' | 'removed' }) => {
          listener({ uri: params.uri, changeType: params.changeType ?? 'changed' });
        },
      );
      return { dispose: () => disposable.dispose() };
    },
  };
}
