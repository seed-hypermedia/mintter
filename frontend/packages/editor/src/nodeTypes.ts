import {
  PARAGRAPH,
  BLOCKQUOTE,
  CODE_BLOCK,
  LINK,
  IMAGE,
  ListType,
  HeadingType,
} from '@udecode/slate-plugins'

export const nodeTypes = {
  typeP: PARAGRAPH,
  typeBlockquote: BLOCKQUOTE,
  typeCode: CODE_BLOCK,
  typeLink: LINK,
  typeImg: IMAGE,
  typeUl: ListType.UL,
  typeOl: ListType.OL,
  typeLi: ListType.LI,
  typeH1: HeadingType.H1,
  typeH2: HeadingType.H2,
  typeH3: HeadingType.H3,
  typeSection: 'section',
}
