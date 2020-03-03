export const shortcutTypes = {
  LIST_ITEM: 'list-item',
  BLOCK_QUOTE: 'block-quote',
  HEADING_ONE: 'heading-one',
  HEADING_TWO: 'heading-two',
  HEADING_THREE: 'heading-three',
  HEADING_FOUR: 'heading-four',
  HEADING_FIVE: 'heading-five',
  HEADING_SIX: 'heading-six',
  BULLETED_LIST: 'bulleted_list',
  NUMBERED_LIST: 'numbered_list',
  LINK: 'link',
  PARAGRAPH: 'paragraph',
} as const;

// TODO: fix types
export const SHORTCUTS = {
  '*': shortcutTypes.LIST_ITEM,
  '-': shortcutTypes.LIST_ITEM,
  '+': shortcutTypes.LIST_ITEM,
  '1.': shortcutTypes.LIST_ITEM,
  '>': shortcutTypes.BLOCK_QUOTE,
  '#': shortcutTypes.HEADING_ONE,
  '##': shortcutTypes.HEADING_TWO,
  '###': shortcutTypes.HEADING_THREE,
  '####': shortcutTypes.HEADING_FOUR,
  '#####': shortcutTypes.HEADING_FIVE,
  '######': shortcutTypes.HEADING_SIX,
} as const;
