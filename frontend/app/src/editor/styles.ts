import {EditorMode} from '@app/editor/plugin-utils'
import {css} from '@app/stitches.config'

export var groupStyles = css({
  margin: 0,
  padding: 0,
  paddingInlineStart: '2rem',
  listStylePosition: 'inside',
  variants: {
    type: {
      orderedList: {},
      unorderedList: {},
      group: {
        listStyleType: 'none',
      },
    },
  },
})

export var blockStyles = css({
  maxInlineSize: '$prose-width',
  position: 'relative',
  '&::marker': {
    color: '$base-active',
    fontSize: '0.95rem',
  },
  variants: {
    groupType: {
      orderedList: {
        // background: 'red',
      },
      unorderedList: {},
      group: {
        listStyle: 'none',
      },
    },
    type: {
      code: {
        // marginInlineStart: '-2rem',
        marginBlock: '1rem',
      },
      blockquote: {
        // marginInlineStart: '-2rem',
        marginBlock: '1rem',
      },
      heading: {},
      statement: {
        // statement styles
      },
    },
  },
})

export var phrasingStyles = css({
  position: 'relative',
  variants: {
    blockType: {
      code: {
        backgroundColor: '$base-background-normal',
        paddingInlineStart: '2rem',
        paddingBlock: '1rem',
        fontSize: '1rem',
      },
      blockquote: {
        paddingInlineStart: '2rem',
        paddingBlock: '1rem',
        fontSize: '1.5rem',
        fontFamily: '$alt',
        fontStyle: 'italic',
        color: '$base-active',
        '&:before': {
          content: '',
          position: 'absolute',
          insetBlockStart: 0,
          insetInlineStart: 0,
          blockSize: '$full',
          inlineSize: '1px',
          backgroundColor: '$primary-active',
        },
      },
      heading: {},
      statement: {
        // statement styles
      },
      callout: {},
    },
    type: {
      staticParagraph: {
        display: 'inline-block',
        fontSize: '1.5rem',
        lineHeight: 2,
        paddingBlock: '0rem',
        fontWeight: '$bold',
      },
      paragraph: {
        // fontSize: '1rem',
        lineHeight: 1.4,
        paddingBlock: '0.5rem',
      },
    },
    mode: {
      [EditorMode.Discussion]: {
        fontSize: '0.5em',
      },
      [EditorMode.Draft]: {},
      [EditorMode.Embed]: {},
      [EditorMode.Mention]: {},
      [EditorMode.Publication]: {},
    },
  },
  defaultVariants: {
    type: 'paragraph',
    blockType: 'statement',
  },
})

export var toolsTargetStyles = css({
  // boxShadow: '$debug',
  position: 'absolute',
  // background: 'red',
  blockSize: '1rem',
  inlineSize: '1rem',
  insetBlockStart: '0.9rem',
  insetInlineStart: '-2rem',

  variants: {
    type: {
      statement: {},
      heading: {},
      code: {},
      blockquote: {
        marginBlock: '1rem',
      },
    },
  },
})
