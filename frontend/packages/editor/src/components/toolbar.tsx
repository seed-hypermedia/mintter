import React from 'react'
import {
  HoveringToolbar,
  ToolbarMark,
  ToolbarBlock,
  ToolbarImage as DefaultToolbarImage,
  ToolbarCode,
  ToolbarLink as DefaultToolbarLink,
  MARK_BOLD,
  MARK_ITALIC,
  MARK_CODE,
} from 'slate-plugins-next'
import {
  Bold,
  Italic,
  Code,
  Link,
  Image,
  Props as IconProps,
} from 'react-feather'

export function Toolbar() {
  return (
    <HoveringToolbar>
      <ToolbarBoldMark />
      <ToolbarMarkItalic />
      <ToolbarMarkCode />
      <ToolbarImage />
      <ToolbarLink />
    </HoveringToolbar>
  )
}

export function ToolbarBoldMark({size = 24, className, ...rest}: IconProps) {
  return (
    <ToolbarMark
      reversed
      format={MARK_BOLD}
      icon={<Bold size={size} />}
      className={className}
      {...rest}
    />
  )
}

export function ToolbarMarkItalic({size = 24, className, ...rest}: IconProps) {
  return (
    <ToolbarMark
      reversed
      format={MARK_ITALIC}
      icon={<Italic size={size} color="currentColor" />}
      className={className}
      {...rest}
    />
  )
}

export function ToolbarMarkCode({size = 24, className, ...rest}: IconProps) {
  return (
    <ToolbarMark
      reversed
      format={MARK_CODE}
      className={className}
      icon={<Code size={size} color="currentColor" {...rest} />}
    />
  )
}

export function ToolbarLink({size = 24, className, ...rest}: IconProps) {
  return (
    <DefaultToolbarLink
      icon={<Link size={size} color="currentColor" />}
      className={className}
      {...rest}
    />
  )
}

export function ToolbarImage({size = 24, className, ...rest}: IconProps) {
  return (
    <DefaultToolbarImage
      icon={<Image size={size} color="currentColor" />}
      className={className}
      {...rest}
    />
  )
}

export {ToolbarMark, ToolbarBlock, ToolbarCode}
