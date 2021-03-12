import type { Ancestor, Editor, NodeEntry, Path, Point, Range } from 'slate';
import { getAbove, setDefaults } from '@udecode/slate-plugins';
import { DEFAULTS_BLOCKLIST } from '../../hierarchy-plugin/defaults';

/**
 * Searches upward for the root list element
 */
export const getListRoot = (
  editor: Editor,
  at: Path | Range | Point | null = editor.selection,
  options?: any,
): NodeEntry<Ancestor> | undefined => {
  if (!at) return;

  const { block_list } = setDefaults(options, DEFAULTS_BLOCKLIST);

  const parentList = getAbove(editor, {
    match: { type: [block_list.type], at },
  });

  if (parentList) {
    const [, parentListPath] = parentList;

    return getListRoot(editor, parentListPath, options) ?? parentList;
  }
};
