import {motion} from 'framer-motion'
import type {Variants} from 'framer-motion'
import type {CSS} from '@mintter/ui/stitches.config'
import {Box, Button, Text} from '@mintter/ui'
import type {ButtonProps, TextProps} from '@mintter/ui'
import type {GenSeedResponse} from '@mintter/client'
import {styled} from '@mintter/ui/stitches.config'
import {textStyles} from '@mintter/ui/text/text'
import type React from 'react'

export type ReactNode<T = any> = T & {
  children: React.ReactNode
}
export interface OnboardingStepPropsType {
  prev: () => void
  next: () => void
  generateSeed: () => Promise<GenSeedResponse>
}

const containerAnimationVariants: Variants = {
  visible: {
    transition: {
      when: 'beforeChildren',
      staggerChildren: 0.25,
    },
  },
  hidden: {
    transition: {
      when: 'afterChildren',
      staggerChildren: 0.25,
    },
  },
}

export const fadeAnimationVariants: Variants = {
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
}

export const slideDownAnimationVariants: Variants = {
  visible: {
    ...fadeAnimationVariants.visible,
    y: 0,
  },
  hidden: {
    ...fadeAnimationVariants.hidden,
    y: -30,
  },
}

export const slideUpAnimationVariants: Variants = {
  visible: {
    ...fadeAnimationVariants.visible,
    y: 0,
  },
  hidden: {
    ...fadeAnimationVariants.hidden,
    y: 30,
  },
}

const OnboardingStepStyled = styled(motion.form, {
  boxSizing: 'border-box',
  alignItems: 'center',
  display: 'flex',
  flex: 'auto',
  flexDirection: 'column',
  gap: '$7',
  justifyContent: 'center',
})

export function OnboardingStep(props) {
  return (
    <OnboardingStepStyled
      variants={containerAnimationVariants}
      initial="hidden"
      data-testid="onboarding-wrapper"
      animate="visible"
      exit="hidden"
      {...props}
    />
  )
}

const OnboardingStepTitleStyled = styled(motion.header, {
  boxSizing: 'border-box',
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: '$5',
})

export function OnboardingStepTitle({
  icon,
  children,
  ...props
}: ReactNode<{
  icon?: JSX.Element
  css?: CSS
}>) {
  return (
    <OnboardingStepTitleStyled variants={slideDownAnimationVariants} data-cy="welcome-title" {...props}>
      {icon}
      <Text alt as="h1" size="9" css={{textAlign: 'center'}}>
        {children}
      </Text>
    </OnboardingStepTitleStyled>
  )
}

const OnboardingStepDescriptionStyled = styled(motion.p, textStyles, {
  textAlign: 'center',
  maxWidth: '$three-quarters',
})

export function OnboardingStepDescription(props: ReactNode<TextProps>): JSX.Element {
  return <OnboardingStepDescriptionStyled variants={fadeAnimationVariants} {...props} />
}

const OnboardingStepBodyStyled = styled(motion.main, {
  boxSizing: 'border-box',
  marginTop: 'auto',
  width: '100%',
})
export function OnboardingStepBody(props: ReactNode<{css: CSS}>) {
  return <OnboardingStepBodyStyled data-testid="onboarding-body" variants={fadeAnimationVariants} {...props} />
}

const OnboardingStepActionsStyled = styled(motion.footer, {
  boxSizing: 'border-box',
  display: 'flex',
  justifyContent: 'space-evenly',
  marginTop: 'auto',
  width: '100%',
  [`& > ${Button}`]: {
    maxWidth: 240,
    width: '100%',
  },
})

export function OnboardingStepActions(props: ReactNode<{css?: CSS}>) {
  return <OnboardingStepActionsStyled variants={slideUpAnimationVariants} {...props} />
}

export function OnboardingStepButton(props: ReactNode<ButtonProps & React.HTMLProps<HTMLButtonElement>>) {
  return <Button type="button" shape="pill" size="3" {...props} />
}

export function SecurityPackIcon() {
  return (
    <IconContainer>
      <svg width="30" height="36" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M15 34.6666C15 34.6666 28.3334 28 28.3334 18V6.33331L15 1.33331L1.66669 6.33331V18C1.66669 28 15 34.6666 15 34.6666Z"
          stroke="#191919"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconContainer>
  )
}

export function ProfileInformationIcon() {
  return (
    <IconContainer>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M33.3334 34V30.6667C33.3334 28.8986 32.631 27.2029 31.3807 25.9526C30.1305 24.7024 28.4348 24 26.6667 24H13.3334C11.5652 24 9.86955 24.7024 8.61931 25.9526C7.36907 27.2029 6.66669 28.8986 6.66669 30.6667V34"
          stroke="#191919"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 17.3333C23.6819 17.3333 26.6666 14.3486 26.6666 10.6667C26.6666 6.98477 23.6819 4 20 4C16.3181 4 13.3333 6.98477 13.3333 10.6667C13.3333 14.3486 16.3181 17.3333 20 17.3333Z"
          stroke="#191919"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconContainer>
  )
}

function IconContainer({children}: ReactNode<any>) {
  return (
    <Box
      css={{
        alignItems: 'center',
        backgroundColor: '$primary-muted',
        borderRadius: '50%',
        display: 'flex',
        height: 72,
        justifyContent: 'center',
        width: 72,
      }}
    >
      {children}
    </Box>
  )
}
