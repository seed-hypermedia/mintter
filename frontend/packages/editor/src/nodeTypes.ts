import {
  PARAGRAPH,
  BLOCKQUOTE,
  CODE,
  LINK,
  IMAGE,
  ListType,
  HeadingType,
} from 'slate-plugins-next'

export const nodeTypes = {
  typeP: PARAGRAPH,
  typeBlockquote: BLOCKQUOTE,
  typeCode: CODE,
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
