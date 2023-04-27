import {styled, YStack} from 'tamagui'

export const StepWrapper = styled(YStack, {
  variants: {
    isLeft: {true: {x: -200, opacity: 0}},
    isRight: {true: {x: 200, opacity: 0}},
  } as const,
})
