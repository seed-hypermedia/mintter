import {css, styled} from '@mintter/ui/stitches.config'
import {Tools} from '../statement-tools'

export const statementStyle = css({
  marginTop: '$6',
  padding: 0,
  listStyle: 'none',
  display: 'grid',
  wordBreak: 'break-word',
  gridTemplateColumns: '$space$8 1fr',
  gridTemplateRows: 'min-content auto min-content',
  gap: 0,
  gridTemplateAreas: `"controls content"
    ". children"
    ". citations"`,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },
  '& > [data-element-type="paragraph"], & > [data-element-type="code"], & > [data-element-type="staticParagraph"]': {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

export const StatementUI = styled('li', statementStyle)
