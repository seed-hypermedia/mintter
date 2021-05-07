import type { TNode } from '@udecode/slate-plugins-core';
import { ELEMENT_BLOCK } from './block-plugin/create-block-plugin';

export const createElement = (
  text = '',
  {
    type = ELEMENT_BLOCK,
    id,
    mark,
    ...rest
  }: {
    type?: string;
    mark?: string;
    id?: string;
  } = {},
) => {
  const leaf: any = { text };
  if (mark) {
    leaf[mark] = true;
  }

  let node: TNode<{}> = {
    type,
    children: [leaf],
  };

  if (id) {
    node.id = id;
  }

  return node;
};
