import {styled} from '@app/stitches.config'

const Title = styled('h3', {
  fontSize: '$5',
  paddingHorizontal: '$7',
  fontWeight: 'normal',
  color: '$base-text',
})

export function PanelTitle({children}: {children: React.ReactNode}) {
  return <Title>{children}</Title>
}
