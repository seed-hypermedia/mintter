import {Icon, icons} from '@mintter/ui/icon'
import {css, keyframes, styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import {globalShortcut} from '@tauri-apps/api'
import {nanoid} from 'nanoid'
import {createContext, PropsWithChildren, useContext, useEffect} from 'react'
export interface BaseMenuItem {
  type: string
  id?: string
}

export interface NormalMenuItem extends BaseMenuItem {
  type: 'normal'
  label?: string
  accelerator?: string
  enabled?: boolean
  icon?: keyof typeof icons
  onClick?: (event?: Event) => void
}

export interface SeparatorMenuItem extends BaseMenuItem {
  type: 'separator'
}

export type MenuItem = NormalMenuItem | SeparatorMenuItem

export const separator = (): SeparatorMenuItem => ({
  id: nanoid(),
  type: 'separator',
})

export const cut = (): NormalMenuItem => ({
  type: 'normal',
  id: 'cut',
  label: 'Cut',
  // accelerator: 'CmdOrControl+X',
  enabled: true,
})

export const copy = (): NormalMenuItem => ({
  type: 'normal',
  id: 'copy',
  label: 'Copy',
  // accelerator: 'CmdOrControl+C',
  enabled: true,
})

export const paste = (): NormalMenuItem => ({
  type: 'normal',
  id: 'paste',
  label: 'Paste',
  // accelerator: 'CmdOrControl+V',
  enabled: true,
})

export const undo = (): NormalMenuItem => ({
  type: 'normal',
  id: 'undo',
  label: 'Undo',
  // accelerator: 'CmdOrControl+Z',
  enabled: true,
})

export const redo = (): NormalMenuItem => ({
  type: 'normal',
  id: 'redo',
  label: 'Redo',
  // accelerator: 'Shift+CmdOrControl+Z',
  enabled: true,
})

export const custom = (opts: Omit<NormalMenuItem, 'type' | 'label'> & {label: string}): NormalMenuItem => ({
  type: 'normal',
  id: opts.label.toLowerCase(),
  ...opts,
  enabled: true,
})

const SeparatorStyles = css({
  height: 1,
  backgroundColor: '$background-neutral',
  margin: 8,
})

const MenuItemStyles = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'start',
  gap: '$4',
  paddingVertical: '$2',
  paddingHorizontal: '$4',
  cursor: 'pointer',
  '&:focus': {
    outline: 'none',
    backgroundColor: '$primary-muted',
    cursor: 'pointer',
  },
})

const slideUpAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideRightAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(-2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

const slideDownAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(-2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideLeftAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

const MenuContentStyles = css({
  minWidth: 220,
  backgroundColor: 'white',
  borderRadius: 6,
  padding: 5,
  boxShadow: '0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)',
  '@media (prefers-reduced-motion: no-preference)': {
    animationDuration: '400ms',
    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform, opacity',
    '&[data-state="open"]': {
      '&[data-side="top"]': {animationName: slideDownAndFade},
      '&[data-side="right"]': {animationName: slideLeftAndFade},
      '&[data-side="bottom"]': {animationName: slideUpAndFade},
      '&[data-side="left"]': {animationName: slideRightAndFade},
    },
  },
})

type GetItems = (key: string) => MenuItem[]

export const GetItemsContext = createContext<GetItems | null>(null)

export const MenuProvider = GetItemsContext.Provider

const ContextMenuContent = styled(ContextMenuPrimitive.Content, MenuContentStyles)
const ContextMenuItem = styled(ContextMenuPrimitive.Item, MenuItemStyles)
const ContextMenuSeparator = styled(ContextMenuPrimitive.Separator, SeparatorStyles)

export function ContextMenu({children, name}: PropsWithChildren<{name: string}>) {
  const getItems = useContext(GetItemsContext)

  if (!getItems) throw new Error('forgot to add menu provider?')

  const items = getItems(name)

  if (!items.length) return <>{children}</>

  type WithAccelerator = Omit<NormalMenuItem, 'accelerator'> & {accelerator: string; onClick: (event?: Event) => void}

  const withAccelerator = items.filter((item): item is WithAccelerator => 'accelerator' in item && 'onClick' in item)

  useEffect(() => {
    withAccelerator.map((item) =>
      globalShortcut.register(item.accelerator, () => document.hasFocus() && item.onClick()),
    )

    return () => {
      withAccelerator.map((item) => globalShortcut.unregister(item.accelerator))
    }
  }, withAccelerator)

  return (
    <ContextMenuPrimitive.Root modal={true}>
      <ContextMenuPrimitive.Trigger>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuContent alignOffset={-5}>
        {items.map((item) => {
          if (item.type === 'separator') {
            return <ContextMenuSeparator key={item.id} />
          }
          if (item.type === 'normal') {
            return (
              <ContextMenuItem key={item.id} onSelect={item.onClick} disabled={!item.enabled}>
                {item.icon && <Icon name={item.icon} />}
                <Text size="2">{item.label}</Text>
                {item.accelerator && <Text size="1">{item.accelerator}</Text>}
              </ContextMenuItem>
            )
          }
        })}
      </ContextMenuContent>
    </ContextMenuPrimitive.Root>
  )
}
