import { setDefaults } from '@udecode/slate-plugins';
import { Editor, Path } from 'slate';

import { DEFAULTS_BLOCK } from '../../block-plugin/defaults';

export const isBlockListNested = (
  editor: Editor,
  listPath: Path,
  options?: any,
) => {
  const { block } = setDefaults(options, DEFAULTS_BLOCK);

  const [listParentNode] = Editor.parent(editor, listPath);

  return listParentNode.type === block.type;
};
