import {Box} from '@src/box'
import {theme, darkTheme} from '@src/stitches.config'
import {Text} from '@src/text'
import {useMemo} from 'react'

type Color = typeof theme.colors[keyof typeof theme.colors]

type SwatchesProps = React.ComponentProps<typeof Box> & {
  colors: Record<string, Color>
}

const Swatches: React.FC<SwatchesProps> = ({colors, ...props}) => {
  const groups = useMemo(
    () =>
      Object.entries(
        Object.entries(colors).reduce<Record<string, Record<string, Color>>>(
          (acc, [name, token]) => {
            const [group, ...shade] = name.split('-')
            acc[group] ||= {}
            acc[group][shade.join('-')] = token
            return acc
          },
          {},
        ),
      ).reduce<{name: string; swatches: {name: string; token: Color}[]}[]>(
        (allGroups, [group, swatchesMap]) => [
          ...allGroups,
          {
            name: group,
            swatches: Object.entries(swatchesMap).reduce<
              {name: string; token: Color}[]
            >(
              (siblingSwatches, [swatch, token]) => [
                ...siblingSwatches,
                {name: swatch, token},
              ],
              [],
            ),
          },
        ],
        [],
      ),
    [colors],
  )

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '$xxl',
        marginTop: '$lg',
        gap: '$xl',
      }}
      {...props}
    >
      {groups.map(group => (
        <Box
          key={group.name}
          css={{
            backgroundColor: '$background-alt',
            borderRadius: 4,
            boxShadow: 'rgba(100, 100, 111, 0.2) 0px 7px 29px 0px',
            display: 'flex',
            flexDirection: 'column',
            gap: '$lg',
            padding: '$md',
          }}
        >
          <Text alt fontWeight="medium">
            {group.name}
          </Text>
          <Box
            css={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '$lg',
            }}
          >
            {group.swatches.map(swatch => (
              <Box
                key={swatch.name}
                css={{alignItems: 'center', display: 'flex', gap: '$md'}}
              >
                <Box
                  css={{
                    backgroundColor: swatch.token,
                    borderRadius: 8,
                    boxShadow:
                      'rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;',
                    flexShrink: 0,
                    height: 40,
                    width: 40,
                  }}
                />
                <Box
                  css={{display: 'flex', flexDirection: 'column', gap: '$xxxs'}}
                >
                  <Text fontSize="xs">${swatch.token.token}</Text>
                  <Text fontSize="xs">{swatch.token.value}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export const Palette: React.FC = () => {
  return (
    <Swatches
      colors={Object.entries(theme.colors).reduce(
        (acc, [name, token]) =>
          name.startsWith('palette')
            ? {...acc, [name.replace('palette-', '')]: token}
            : acc,
        {},
      )}
    />
  )
}

export const LightTheme: React.FC = () => {
  return (
    <Swatches
      colors={Object.entries(theme.colors).reduce(
        (acc, [name, token]) =>
          name.startsWith('palette') ? acc : {...acc, [name]: token},
        {},
      )}
    />
  )
}

export const DarkTheme: React.FC = () => {
  return (
    <Swatches
      className={darkTheme}
      colors={((darkTheme as unknown) as typeof theme).colors}
    />
  )
}
