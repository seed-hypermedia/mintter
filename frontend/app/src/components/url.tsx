import {styled} from '@app/stitches.config'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {open} from '@tauri-apps/api/shell'
import {useState} from 'react'
import {Box} from './box'
import {Icon} from './icon'

export function AccessURLRow({url, title}: {url: string; title?: string}) {
  const [isClipboardCopied, setIsClipboardCopied] = useState(false)

  return (
    <URLRow>
      <URLButton
        onClick={() => {
          open(url)
        }}
      >
        <IconSpan>
          <Icon name="Globe" />
        </IconSpan>

        {title || url}
      </URLButton>
      <ClipboardButton
        onClick={() => {
          copyTextToClipboard(url)
          setIsClipboardCopied(true)
          setTimeout(() => {
            setIsClipboardCopied(false)
          }, 2000)
        }}
        active={isClipboardCopied}
      >
        <Icon name="Copy" />
      </ClipboardButton>
    </URLRow>
  )
}
const IconSpan = styled('span', {
  display: 'flex',
  alignSelf: 'center',
  marginRight: '$3',
  marginLeft: '$2',
})
const URLRow = styled('div', {
  borderRadius: '$2',
  border: '1px solid transparent',
  //   borderColor: '$base-border-subtle',
  //   background: '$base-background-normal',

  borderColor: '$success-border-subtle',
  background: '$success-background-normal',
  '&:hover': {
    borderColor: '$success-border-normal',
  },
  overflow: 'hidden',
  position: 'relative',
})
const URLButton = styled('button', {
  border: 'none',
  margin: 0,
  background: 'transparent',
  display: 'flex',
  cursor: 'pointer',
})
const ClipboardButton = styled('button', {
  //   background: '#ffffffcc',
  background: 'white',
  position: 'absolute',
  border: '1px solid #fff',
  //   borderColor: props.active ? '$success-border-normal' : '$base-border-subtle',
  '&:hover': {
    borderColor: '$base-text-low',
  },
  variants: {
    active: {
      true: {
        borderColor: '$success-border-normal',
        color: '$success-border-normal',
        '&:hover': {
          borderColor: '$success-border-normal',
        },
      },
    },
  },
  right: 2,
  top: 0,
  bottom: 0,
  borderRadius: '$1',
  width: 36,
  cursor: 'pointer',
})
