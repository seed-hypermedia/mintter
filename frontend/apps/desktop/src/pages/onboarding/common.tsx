import {accountsClient, daemonClient} from '@app/api-clients'
import type {CSS} from '@app/stitches.config'
import {styled} from '@app/stitches.config'
import {Box} from '@components/box'
import type {TextProps} from '@components/text'
import {Text, textStyles} from '@components/text'
import {Button} from '@mintter/ui'
import type {Variants} from 'framer-motion'
import {motion} from 'framer-motion'
import {ComponentProps, PropsWithChildren, ReactNode} from 'react'
export interface OnboardingStepPropsType {
  prev?: () => void
  next: () => void
  updateProfile?: typeof accountsClient.updateProfile
  generateMnemonic?: typeof daemonClient.genMnemonic
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

const OnboardingStepStyled = styled(motion.div, {
  boxSizing: 'border-box',
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: '$8',
  justifyContent: 'center',
})

export function OnboardingStep({children}: {children: ReactNode}) {
  return (
    <OnboardingStepStyled
      variants={containerAnimationVariants}
      initial="hidden"
      data-testid="onboarding-wrapper"
      animate="visible"
      exit="hidden"
    >
      {children}
    </OnboardingStepStyled>
  )
}

const OnboardingStepTitleStyled = styled(motion.header, {
  boxSizing: 'border-box',
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: '$5',
  fontFamily: '$alt',
})

export function OnboardingStepTitle({
  icon,
  children,
  ...props
}: PropsWithChildren<{
  icon?: JSX.Element
  css?: CSS
}>) {
  return (
    <OnboardingStepTitleStyled
      variants={slideDownAnimationVariants}
      data-testid="title"
      {...props}
    >
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
  fontFamily: '$base',
})

export function OnboardingStepDescription(props: PropsWithChildren<TextProps>) {
  return (
    <OnboardingStepDescriptionStyled
      variants={fadeAnimationVariants}
      {...props}
    />
  )
}

const OnboardingStepBodyStyled = styled(motion.main, {
  boxSizing: 'border-box',
  marginTop: 'auto',
  width: '100%',
  fontFamily: '$base',
})
export function OnboardingStepBody(props: PropsWithChildren<{css?: CSS}>) {
  return (
    <OnboardingStepBodyStyled
      data-testid="onboarding-body"
      variants={fadeAnimationVariants}
      {...props}
    />
  )
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

export function OnboardingStepActions(props: PropsWithChildren<{css?: CSS}>) {
  return (
    <OnboardingStepActionsStyled
      variants={slideUpAnimationVariants}
      {...props}
    />
  )
}

export function OnboardingStepButton(
  props: PropsWithChildren<ComponentProps<typeof Button>>,
) {
  return (
    <Button
      // size="$7"
      paddingVertical="$3"
      paddingHorizontal="$8"
      {...props}
      onPress={(e) => {
        e.preventDefault()
        props.onPress?.(e)
      }}
    />
  )
}

export function IconContainer({children}: PropsWithChildren<unknown>) {
  return (
    <Box
      css={{
        alignItems: 'center',
        backgroundColor: '$primary-component-bg-normal',
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
