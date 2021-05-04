import castArray from 'lodash/castArray';
import type { Editor } from 'slate';
import { EditorNodesOptions, getNodes } from '@udecode/slate-plugins';

/**
 * Get the nodes with a type included in `types` at a location (default: selection).
 */
export const getNodesByType = (
  editor: Editor,
  types: string[] | string,
  options: Omit<EditorNodesOptions, 'match'> = {},
) => {
  types = castArray<string>(types);

  return getNodes(editor, {
    match: (n) => types.includes(n.type as string),
    ...options,
  });
};
