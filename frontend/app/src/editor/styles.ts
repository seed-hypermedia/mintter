import { EditorMode } from '@app/editor/plugin-utils'
import { css } from '@app/stitches.config'

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
    zIndex: 10,
    position: 'relative',
  },
  // '&:hover': {
  //   boxShadow: '$debug',
  // },
  variants: {
    groupType: {
      orderedList: {
        // background: 'red',
      },
      unorderedList: {
        listStyleType: 'disc',
      },
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
  zIndex: 1,
  '& > *': {
    position: 'relative',
    zIndex: 10,
  },
  '&:after': {
    content: '',
    position: 'absolute',
    top: 0,
    left: '50%',
    rigth: 0,
    transform: 'translateX(-50%)',
    width: '200vw',
    height: '$full',
    zIndex: -1,
    opacity: 0,
    transition: 'opacity 0.35s ease',
    backgroundColor: 'transparent',
  },

  // '&:hover': {
  //   '&:after': {
  //     backgroundColor: '$base-component-bg-normal !important',
  //     opacity: 1,
  //   },
  // },
  variants: {
    blockType: {
      code: {
        backgroundColor: '$base-background-normal',
        paddingInlineStart: '2rem',
        paddingBlock: '1rem',
        fontSize: '1rem',
        whiteSpace: 'pre',
      },
      blockquote: {
        paddingInlineStart: '1rem',
        paddingBlock: '0.8rem',
        fontSize: '1.2rem',
        fontFamily: '$alt',
        fontStyle: 'italic',
        color: '$base-active',
        '&:after': {
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
    highlight: {
      true: {
        '&:after': {
          backgroundColor: '$primary-component-bg-normal',
          opacity: 1,
        },
      },
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
  blockSize: '1rem',
  inlineSize: '1rem',
  insetBlockStart: '0.9rem',
  insetInlineStart: '-2rem',

  variants: {
    type: {
      statement: {},
      heading: {
        insetBlockStart: '1rem',
      },
      code: {},
      blockquote: {
        insetBlockStart: '1.3rem',
      },
    },
  },
})

export var embedStyles = css({
  borderBottom: '3px solid transparent',
  fontStyle: 'italic',
  userSelect: 'none',
  zIndex: 1,
  '& > *': {
    zIndex: 10,
  },
  '&:hover': {
    borderBottomColor: '$primary-border-hover',
    cursor: 'pointer',
    color: '$primary-active',
  },
  '&:after': {
    display: 'none',
  },
  '&:before': {
    content: '',
    position: 'absolute',
    top: 0,
    left: '50%',
    rigth: 0,
    transform: 'translateX(-50%)',
    width: '200vw',
    height: '$full',
    zIndex: -1,
    opacity: 0,
    transition: 'opacity 0.35s ease',
    backgroundColor: 'transparent',
  },
})
