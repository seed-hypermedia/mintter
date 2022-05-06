import {css, styled} from '@app/stitches.config'

export const footerStyles = css({
  background: '$background-alt',
  width: '$full',
  position: 'absolute',
  bottom: 0,
  zIndex: '$max',
  display: 'flex',
  justifyContent: 'space-between',
  '&:after': {
    content: '',
    position: 'absolute',
    width: '$full',
    height: 20,
    background:
      'linear-gradient(0deg, $colors$background-alt 0%, rgba(255,255,255,0) 100%)',
    top: -20,
    left: 0,
  },
})
export const footerMetadataStyles = css({
  flex: 'none',
  background: '$background-alt',
  padding: '$5',
  display: 'flex',
  alignItems: 'center',
})

export const footerButtonsStyles = css({
  display: 'flex',
  gap: '$5',
  padding: '$5',
  paddingRight: 0,
  alignItems: 'center',
})

export const PageFooterSeparator = styled('div', {
  width: 1,
  height: '80%',
  marginLeft: '$4',
  marginRight: '$4',
  background: '$background-neutral-strong',
})
