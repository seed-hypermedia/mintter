import {Box, BoxProps} from '@src/box'
import {darkTheme, lightTheme, theme} from '@src/stitches.config'
import {Text, TextProps} from '@src/text'
import {useMemo} from 'react'

import {Demo, DemoItem} from './demo'

type TypographyDemoProps = TextProps & {
  scale: keyof typeof theme
  cssProp: string
  text?: string
}

const TypographyDemo: React.FC<TypographyDemoProps> = ({
  scale,
  cssProp,
  css,
  text = 'The Jedi Master trained the young Padawan',
  ...props
}) => {
  return (
    <Demo>
      {Object.entries(theme[scale]).map(([name, token]) => (
        <DemoItem key={name} title={`$${token.token} (${token.value})`}>
          <Text css={{[cssProp]: token, ...css}} {...props}>
            {text}
          </Text>
        </DemoItem>
      ))}
    </Demo>
  )
}

export const FontFamilies: React.FC = () => {
  return (
    <TypographyDemo
      scale="fonts"
      cssProp="fontFamily"
      css={{fontSize: '$2xl', fontWeight: '$medium'}}
    />
  )
}

export const FontSizes: React.FC = () => {
  return <TypographyDemo scale="fontSizes" cssProp="fontSize" />
}

export const FontWeights: React.FC = () => {
  return <TypographyDemo scale="fontWeights" cssProp="fontWeight" />
}
export const LineHeights: React.FC = () => {
  return (
    <TypographyDemo
      scale="lineHeights"
      cssProp="lineHeight"
      text="Lucas ipsum dolor sit amet hutt alderaan ponda darth thrawn yavin jar
          dantooine solo mandalorians. Mon gamorrean droid lars skywalker kit.
          Luuke chewbacca darth darth. Jango kessel chewbacca darth sidious.
          Naboo tatooine chewbacca hutt chewbacca jango endor droid palpatine.
          Darth antilles obi-wan luke darth sith mustafar moff yoda. Alderaan
          darth organa kit darth bespin mara tatooine solo. Ventress skywalker
          secura fett mandalore. Lando luke darth mace jinn antilles organa moff
          hutt. K-3po darth antilles yavin."
    />
  )
}

type Color = typeof theme.colors[keyof typeof theme.colors]

type SwatchesProps = BoxProps & {
  colors: Record<string, Color>
}

const ColorsDemo: React.FC<SwatchesProps> = ({colors, ...props}) => {
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
        display: 'grid',
        gap: '$m',
        gridTemplateColumns: 'repeat(2, 1fr)',
        marginVertical: '$l',
      }}
      {...props}
    >
      {groups.map(group => (
        <Demo key={group.name} css={{margin: '$none'}}>
          {group.swatches.map(swatch => (
            <Box
              key={swatch.name}
              css={{alignItems: 'center', display: 'flex', gap: '$m'}}
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
                css={{display: 'flex', flexDirection: 'column', gap: '$3xs'}}
              >
                <Text variant="ui-tiny">${swatch.token.token}</Text>
                <Text variant="ui-tiny" color="mutted">
                  {swatch.token.value}
                </Text>
              </Box>
            </Box>
          ))}
        </Demo>
      ))}
    </Box>
  )
}

export const Palette: React.FC = () => {
  return (
    <ColorsDemo
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
    <ColorsDemo
      className={lightTheme}
      colors={((lightTheme as unknown) as typeof theme).colors}
    />
  )
}

export const DarkTheme: React.FC = () => {
  return (
    <ColorsDemo
      className={darkTheme}
      colors={((darkTheme as unknown) as typeof theme).colors}
    />
  )
}

type SpacedDemoItemProps = {token: string; value: string}

const SpacedDemoItem: React.FC<SpacedDemoItemProps> = ({
  token,
  value,
  children,
}) => {
  return (
    <Box
      css={{
        alignItems: 'center',
        display: 'grid',
        gap: '$m',
        gridTemplateColumns: '100px 1fr 100px',
      }}
    >
      <Text variant="ui-tiny" color="mutted">
        ${token}
      </Text>
      {children}
      <Text variant="ui-tiny" color="mutted">
        {value}
      </Text>
    </Box>
  )
}

export const Spaces: React.FC = () => {
  return (
    <Demo>
      {Object.entries(theme.space).map(([name, token]) => (
        <SpacedDemoItem key={name} token={token.token} value={token.value}>
          <Box
            css={{
              backgroundColor: '$background-neutral',
              display: 'flex',
              height: 25,
              paddingLeft: token,
            }}
          >
            <Box
              css={{
                backgroundColor: '$background-alt',
                flex: 1,
              }}
            />
          </Box>
        </SpacedDemoItem>
      ))}
    </Demo>
  )
}

export const Sizes: React.FC = () => {
  return (
    <Demo>
      {Object.entries(theme.sizes).map(([name, token]) => (
        <SpacedDemoItem key={name} token={token.token} value={token.value}>
          <Box>
            <Box
              css={{
                backgroundColor: '$background-neutral',
                display: 'flex',
                height: 25,
                width: token,
              }}
            />
          </Box>
        </SpacedDemoItem>
      ))}
    </Demo>
  )
}
