import {css, styled} from '@mintter/ui/stitches.config'

export const statementStyle = css({
  marginTop: '$6',
  padding: 0,
  listStyle: 'none',
  position: 'relative',
  [`[data-element-type="orderedList"] > &, [data-element-type="unorderedList"] > &`]: {
    listStyle: 'inherit',
    '&:marker': {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    },
  },
  wordBreak: 'break-word',
})

export const StatementUI = styled('li', statementStyle)
