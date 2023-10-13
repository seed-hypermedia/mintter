import {HMHeadingBlockContent} from '@/heading-component-plugin'
import {BulletListItemBlockContent} from '../nodes/BlockContent/ListItemBlockContent/BulletListItemBlockContent/BulletListItemBlockContent'
import {NumberedListItemBlockContent} from '../nodes/BlockContent/ListItemBlockContent/NumberedListItemBlockContent/NumberedListItemBlockContent'
import {ParagraphBlockContent} from '../nodes/BlockContent/ParagraphBlockContent/ParagraphBlockContent'
import {PropSchema, TypesMatch} from './blockTypes'

export const defaultProps = {
  textAlignment: {
    default: 'left' as const,
    values: ['left', 'center', 'right', 'justify'] as const,
  },
} satisfies PropSchema

export type DefaultProps = typeof defaultProps

export const defaultBlockSchema = {
  paragraph: {
    propSchema: {
      ...defaultProps,
      type: {default: 'p'},
    },
    node: ParagraphBlockContent,
  },
  heading: {
    propSchema: {
      ...defaultProps,
      level: {default: '2', values: ['1', '2', '3'] as const},
    },
    node: HMHeadingBlockContent,
  },
  bulletListItem: {
    propSchema: defaultProps,
    node: BulletListItemBlockContent,
  },
  numberedListItem: {
    propSchema: defaultProps,
    node: NumberedListItemBlockContent,
  },
} as const

export type DefaultBlockSchema = TypesMatch<typeof defaultBlockSchema>
