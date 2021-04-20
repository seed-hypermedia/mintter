import Prism, {defaultProps, Language} from 'prism-react-renderer'
import highlightThemeDark from 'prism-react-renderer/themes/nightOwl'
import highlightThemeLight from 'prism-react-renderer/themes/nightOwlLight'
import {useCallback, useMemo, useState} from 'react'
import {LivePreview, LiveProvider} from 'react-live'

import {Box} from '@src/box'
import {Button} from '@src/button'
import {Icon} from '@src/icon'
import {styled} from '@src/stitches.config'
import {Text} from '@src/text'
import {TextField} from '@src/text-field'
import {Theme, useTheme} from '@src/theme'

const liveScope = {
  Box,
  Button,
  Icon,
  Text,
  TextField,
}

const Preview = styled(LivePreview, {
  display: 'flex',
  gap: '$6',
  padding: '$6',

  variants: {
    direction: {
      horizontal: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
      },
      vertical: {
        alignItems: 'start',
        flexDirection: 'column',
      },
    },
  },

  defaultVariants: {
    direction: 'vertical',
  },
})

export function Code({
  className,
  columns,
  children,
}: {
  className: string
  columns?: boolean
  children: string
}) {
  const commonProps = useMemo(
    () => ({
      language: className.replace('language-', '') as Language,
      code: `<>${children.trim()}</>`,
    }),
    [children, className],
  )

  if (commonProps.language === 'jsx') {
    return (
      <LiveProvider scope={liveScope} {...commonProps}>
        <Highlight
          header={<Preview direction={columns ? 'horizontal' : 'vertical'} />}
          {...commonProps}
        />
      </LiveProvider>
    )
  }

  return <Highlight {...commonProps} />
}

function Highlight({
  header,
  language,
  code,
  footer,
}: {
  header?: React.ReactNode
  language: Language
  code: string
  footer?: React.ReactNode
}) {
  const {currentTheme} = useTheme()

  return (
    <Theme>
      <Box
        css={{
          backgroundColor: '$background-alt',
          borderRadius: 8,
          boxShadow: '$3',
          marginVertical: '$7',
          overflow: 'hidden',
        }}
      >
        {header}
        <Prism
          {...defaultProps}
          theme={
            currentTheme === 'light' ? highlightThemeLight : highlightThemeDark
          }
          code={code.replace(/^<>/, '').replace(/<\/>$/, '')}
          language={language}
        >
          {({className, style, tokens, getLineProps, getTokenProps}) => (
            <Box
              as="pre"
              className={className}
              style={style}
              css={{
                margin: '0px',
                padding: '$6',
              }}
            >
              {tokens.map((line, i) => (
                <Box
                  key={i}
                  {...getLineProps({line, key: i})}
                  css={{paddingVertical: '$1'}}
                >
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({token, key})} />
                  ))}
                </Box>
              ))}
            </Box>
          )}
        </Prism>
        {footer}
      </Box>
    </Theme>
  )
}

type OptionBase<TType, TValueType> = {
  hidden?: boolean
  type: TType
  name: string
  label: string
  defaultValue: TValueType
  computePropsFromValue?: (value: TValueType) => Record<string, any>
}

type BooleanOption = OptionBase<'boolean', boolean>
type SelectOption<T = any> = OptionBase<'select', T> & {options: T[]}
type StringOption = OptionBase<'string', string>

type Option = SelectOption | StringOption | BooleanOption

export function Playground({
  component: Component,
  options,
}: {
  component: React.ComponentType
  options: Option[]
}) {
  const visibleOptions = useMemo(
    () => options.filter(option => option.hidden !== true),
    [options],
  )

  const [values, setValues] = useState<Record<string, any>>(() =>
    options.reduce(
      (acc, option) => ({...acc, [option.name]: option.defaultValue}),
      {},
    ),
  )

  const handleChange = useCallback(
    (option: string, value: any) => {
      setValues({
        ...values,
        [option]: value,
      })
    },
    [values],
  )

  const props = useMemo(
    () =>
      options
        .filter(option => Boolean(values[option.name]))
        .reduce(
          (acc, option) => ({
            ...acc,
            ...(option.computePropsFromValue
              ? option.computePropsFromValue(values[option.name] as never)
              : {[option.name]: values[option.name]}),
          }),
          {},
        ),
    [options, values],
  )

  const code = useMemo(() => {
    const stringifiedProps = Object.entries(props)
      .filter(([prop]) => prop !== 'children')
      .map(([prop, value]) =>
        value === true
          ? prop
          : `${prop}=${
              typeof value === 'string'
                ? JSON.stringify(value)
                : `{${JSON.stringify(value)}}`
            }`,
      )

    const splitter = '\n  '

    if ((props as any).children) {
      return `<${
        Component.displayName ?? 'Component'
      }${splitter}${stringifiedProps.join(splitter)}\n>${splitter}${
        (props as any).children
      }\n</${Component.displayName}>`
    }

    return `<${
      Component.displayName ?? 'Component'
    }${splitter}${stringifiedProps.join(splitter)} />`
  }, [Component.displayName, props])

  const commonProps = useMemo(
    () => ({
      code,
      language: 'jsx' as Language,
    }),
    [code],
  )

  return (
    <LiveProvider scope={liveScope} {...commonProps}>
      <Highlight
        header={<Preview />}
        {...commonProps}
        footer={
          visibleOptions.length ? (
            <Box
              css={{
                color: '$text-default',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '$6',
                padding: '$6',
              }}
            >
              {visibleOptions.map(option => {
                const type = option.type

                if (option.type === 'boolean') {
                  return (
                    <TextField
                      key={option.name}
                      type="checkbox"
                      checked={values[option.name]}
                      label={option.label}
                      onChange={() =>
                        handleChange(option.name, !values[option.name])
                      }
                      // TODO: fix types
                      // @ts-ignore
                      css={{
                        cursor: 'pointer',
                        height: '32px',
                        padding: '0px',
                        width: '32px',
                        '&:checked': {
                          border: '8px solid $colors$background-default',
                          backgroundColor: '$primary-softer',
                        },
                      }}
                    />
                  )
                } else if (option.type === 'select') {
                  return (
                    <TextField
                      key={option.name}
                      // TODO: fix types
                      // @ts-ignore
                      as="select"
                      label={option.label}
                      size="1"
                      value={values[option.name]}
                      onChange={e => handleChange(option.name, e.target.value)}
                      // TODO: fix types
                      // @ts-ignore
                      css={{
                        appearance: 'auto',
                        cursor: 'pointer',
                        borderRight: '$space$4 solid transparent',
                        height: '32px',
                        paddingTop: '7px',
                        paddingLeft: '6px',
                      }}
                    >
                      {option.options.map(selectOption => (
                        <option key={selectOption}>{selectOption}</option>
                      ))}
                    </TextField>
                  )
                } else if (option.type === 'string') {
                  return (
                    <TextField
                      key={option.name}
                      label={option.label}
                      size="1"
                      value={values[option.name]}
                      onChange={e => handleChange(option.name, e.target.value)}
                    />
                  )
                } else {
                  throw new Error(`Unsupported option type: ${type}`)
                }
              })}
            </Box>
          ) : null
        }
      />
    </LiveProvider>
  )
}
