import {Checkbox, createStyles, Stack} from '@mantine/core'
import {createHmDocLink, isHypermediaScheme, unpackHmId} from '@mintter/shared'
import {XStack} from '@mintter/ui'
import {forwardRef, HTMLAttributes, useCallback, useMemo, useState} from 'react'
import {RiLink, RiText} from 'react-icons/ri'
import {EditHyperlinkMenuItem} from './EditHyperlinkMenuItem'

export type EditHyperlinkMenuProps = {
  url: string
  text: string
  update: (url: string, text: string) => void
}

/**
 * Menu which opens when editing an existing hyperlink or creating a new one.
 * Provides input fields for setting the hyperlink URL and title.
 */
export const EditHyperlinkMenu = forwardRef<
  HTMLDivElement,
  EditHyperlinkMenuProps & HTMLAttributes<HTMLDivElement>
>(({url, text, update, className, ...props}, ref) => {
  const {classes} = createStyles({root: {}})(undefined, {
    name: 'EditHyperlinkMenu',
  })

  const [currentUrl, setCurrentUrl] = useState(url)
  const [currentText, setCurrentText] = useState(text)

  const isHmHref = isHypermediaScheme(url)
  const isHmLatest = useMemo(
    () => isHmHref && currentUrl.includes('&l'),
    [currentUrl],
  )

  const handleVersion = useCallback(
    (versionMode: boolean) => {
      let unpackedRef = unpackHmId(url)
      if (unpackedRef) {
        setCurrentUrl(
          createHmDocLink({
            documentId: unpackedRef?.qid,
            version: unpackedRef?.version,
            blockRef: unpackedRef?.blockRef,
            variants: unpackedRef?.variants,
            latest: versionMode,
          }),
        )
      }
    },
    [currentUrl],
  )

  return (
    <Stack
      {...props}
      className={className ? `${classes.root} ${className}` : classes.root}
      ref={ref}
    >
      <EditHyperlinkMenuItem
        icon={RiLink}
        mainIconTooltip={'Edit URL'}
        autofocus={true}
        placeholder={'Edit URL'}
        value={currentUrl}
        onChange={(value) => setCurrentUrl(value)}
        onSubmit={() => update(currentUrl, currentText)}
      />
      <EditHyperlinkMenuItem
        icon={RiText}
        mainIconTooltip={'Edit Title'}
        placeholder={'Edit Title'}
        value={currentText}
        onChange={(value) => setCurrentText(value)}
        onSubmit={() => update(url, currentText)}
      />
      {isHmHref ? (
        <XStack padding="$2">
          <Checkbox
            size="xs"
            label="use Latest Hypermedia reference"
            checked={isHmLatest}
            onChange={(event) => {
              handleVersion(event.currentTarget.checked)
              if (event.currentTarget.checked) {
              }
            }}
            onSubmit={() => update(currentUrl, currentText)}
          />
        </XStack>
      ) : null}
    </Stack>
  )
})
