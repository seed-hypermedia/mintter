import type { EditorNodesOptions } from '@udecode/slate-plugins';
import type { Editor } from 'slate';

import { getNodesByType } from './get-nodes-by-type';

/**
 * Is there a node with a type included in `types` at a location (default: selection).
 */
export const isNodeTypeIn = (
  editor: Editor,
  types: string[] | string,
  options: Omit<EditorNodesOptions, 'match'> = {},
) => {
  const [match] = getNodesByType(editor, types, options);
  return !!match;
};
