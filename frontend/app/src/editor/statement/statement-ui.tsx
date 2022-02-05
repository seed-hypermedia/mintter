import {css, styled} from '@app/stitches.config'

export const statementStyle = css({
  // marginTop: '$6',
  paddingLeft: '$7',
  paddingTop: '$5',
  borderRadius: '$2',

  wordBreak: 'break-word',
  position: 'relative',
  '&::marker': {
    color: '$text-muted',
  },
  '&:hover': {
    backgroundColor: '$block-hover',
  },
  [`[data-element-type="orderedList"] > &::marker`]: {
    fontSize: '0.8em',
  },
  [`[data-element-type="unorderedList"] > &::marker`]: {
    fontSize: '1.2em',
  },

  '& > span': {
    display: 'inline-block',
  },
})

export const StatementUI = styled('li', statementStyle)
