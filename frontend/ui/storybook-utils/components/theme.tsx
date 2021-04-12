import {Box} from '@src/box'
import {theme} from '@src/stitches.config'
import {Text} from '@src/text'
import {useTheme} from '@src/theme'
import {useMemo, useState, useEffect} from 'react'

import {Demo, DemoItem} from './demo'

const TypographyDemo: React.FC<{
  scale: keyof typeof theme
  cssProp: string
  children?: string
}> = ({
  scale,
  cssProp,
  children = 'The Jedi Master trained the young Padawan',
}) => {
  return (
    <Demo>
      {Object.entries(theme[scale]).map(([name, token]) => {
        console.log('🚀 ~ file: theme.tsx', name, token)
        return (
          <DemoItem key={name} title={`$${token.token} (${token.value})`}>
            <Text css={{[cssProp]: token.value}}>{children}</Text>
          </DemoItem>
        )
      })}
    </Demo>
  )
}

export const FontFamilies: React.FC = () => {
  return <TypographyDemo scale="fonts" cssProp="fontFamily" />
}

export const FontSizes: React.FC = () => {
  return <TypographyDemo scale="fontSizes" cssProp="fontSize" />
}

export const FontWeights: React.FC = () => {
  return <TypographyDemo scale="fontWeights" cssProp="fontWeight" />
}
export const LineHeights: React.FC = () => {
  return (
    <TypographyDemo scale="lineHeights" cssProp="lineHeight">
      Lucas ipsum dolor sit amet hutt alderaan ponda darth thrawn yavin jar
      dantooine solo mandalorians. Mon gamorrean droid lars skywalker kit. Luuke
      chewbacca darth darth. Jango kessel chewbacca darth sidious. Naboo
      tatooine chewbacca hutt chewbacca jango endor droid palpatine. Darth
      antilles obi-wan luke darth sith mustafar moff yoda. Alderaan darth organa
      kit darth bespin mara tatooine solo. Ventress skywalker secura fett
      mandalore. Lando luke darth mace jinn antilles organa moff hutt. K-3po
      darth antilles yavin.
    </TypographyDemo>
  )
}

const Color: React.FC<{name: string}> = ({name}) => {
  const {currentTheme} = useTheme()
  const [colorValue, setColorValue] = useState<string>()

  useEffect(() => {
    setColorValue(
      getComputedStyle(document.body).getPropertyValue(
        `--colors-${name.substr(1)}`,
      ),
    )
  }, [name, currentTheme])

  return (
    <Box css={{alignItems: 'center', display: 'flex', gap: '$5'}}>
      <Box
        css={{
          backgroundColor: name,
          borderRadius: 8,
          boxShadow: '$3',
          flexShrink: 0,
          height: 40,
          width: 40,
        }}
      />
      <Box css={{display: 'flex', flexDirection: 'column', gap: '$1'}}>
        <Text size="1">{name}</Text>
        <Text size="1" color="muted">
          {colorValue}
        </Text>
      </Box>
    </Box>
  )
}

export const Colors: React.FC<{groups: string[]}> = ({groups}) => {
  const filteredGroups = useMemo(
    () =>
      Object.keys(theme.colors).reduce<Record<string, string[]>>(
        (allGroups, color) => {
          const [group] = color.split('-')
          if (!groups.includes(group)) return allGroups

          allGroups[group] ||= []
          return {...allGroups, [group]: [...allGroups[group], `$${color}`]}
        },
        {},
      ),
    [groups],
  )

  return (
    <Box
      css={{
        display: 'grid',
        gap: '$5',
        gridTemplateColumns: 'repeat(3, 1fr)',
        marginVertical: '$6',
      }}
    >
      {Object.entries(filteredGroups).map(([group, colors]) => (
        <Demo key={group}>
          <Text>{group}</Text>
          <Box css={{display: 'flex', flexDirection: 'column', gap: '$4'}}>
            {colors.map(color => (
              <Color key={color} name={color} />
            ))}
          </Box>
        </Demo>
      ))}
    </Box>
  )
}

const SpacedDemoItem: React.FC<{token: string; value: string}> = ({
  token,
  value,
  children,
}) => {
  return (
    <Box
      css={{
        alignItems: 'center',
        display: 'grid',
        gap: '$5',
        gridTemplateColumns: '100px 1fr 100px',
      }}
    >
      <Text size="1" color="muted">
        ${token}
      </Text>
      {children}
      <Text size="1" color="muted">
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
              paddingLeft: token.value,
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
                width: token.value,
              }}
            />
          </Box>
        </SpacedDemoItem>
      ))}
    </Demo>
  )
}
