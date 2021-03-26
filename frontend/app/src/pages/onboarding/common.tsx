import { motion, Variants } from 'framer-motion';

import { Box, BoxProps } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';
import { Button } from '@mintter/ui/button';

export type OnboardingStepPropsType = {
  prev: () => void;
  next: () => void;
};

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
};

export const fadeAnimationVariants: Variants = {
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
};

export const slideDownAnimationVariants: Variants = {
  visible: {
    ...fadeAnimationVariants.visible,
    y: 0,
  },
  hidden: {
    ...fadeAnimationVariants.hidden,
    y: -30,
  },
};

export const slideUpAnimationVariants: Variants = {
  visible: {
    ...fadeAnimationVariants.visible,
    y: 0,
  },
  hidden: {
    ...fadeAnimationVariants.hidden,
    y: 30,
  },
};

export const OnboardingStep: React.FC<BoxProps> = ({ css, children }) => {
  return (
    <Box
      as={motion.div}
      variants={containerAnimationVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      css={{
        alignItems: 'center',
        display: 'flex',
        flex: 'auto',
        flexDirection: 'column',
        gap: '$xl',
        justifyContent: 'center',
        ...css,
      }}
    >
      {children}
    </Box>
  );
};

export const OnboardingStepTitle: React.FC<
  BoxProps & { icon?: JSX.Element }
> = ({ css, icon, children }) => {
  return (
    <Box
      as={motion.header}
      variants={slideDownAnimationVariants}
      css={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '$l',
        ...css,
      }}
    >
      {icon}
      <Text
        alt
        as="h1"
        variant="huge"
        css={{ textAlign: 'center', letterSpacing: '-0.96px' }}
      >
        {children}
      </Text>
    </Box>
  );
};

export const OnboardingStepDescription: React.FC<BoxProps> = ({
  css,
  children,
}) => {
  return (
    <Text
      as={motion.p}
      variants={fadeAnimationVariants}
      css={{ textAlign: 'center', maxWidth: 376, ...css }}
    >
      {children}
    </Text>
  );
};

export const OnboardingStepBody: React.FC<BoxProps> = ({ css, children }) => {
  return (
    <Box
      as={motion.main}
      variants={fadeAnimationVariants}
      css={{ marginTop: 'auto', ...css }}
    >
      {children}
    </Box>
  );
};

export const OnboardingStepActions: React.FC<BoxProps> = ({
  css,
  children,
}) => {
  return (
    <Box
      as={motion.footer}
      variants={slideUpAnimationVariants}
      css={{
        display: 'flex',
        justifyContent: 'space-evenly',
        marginTop: 'auto',
        width: '100%',
        [`& > ${Button}`]: {
          maxWidth: 240,
          width: '100%',
        },
        ...css,
      }}
    >
      {children}
    </Box>
  );
};

export const SecurityPackIcon: React.FC = () => {
  return (
    <IconContainer>
      <svg
        width="30"
        height="36"
        viewBox="0 0 30 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 34.6666C15 34.6666 28.3334 28 28.3334 18V6.33331L15 1.33331L1.66669 6.33331V18C1.66669 28 15 34.6666 15 34.6666Z"
          stroke="#191919"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </IconContainer>
  );
};

export const ProfileInformationIcon: React.FC = () => {
  return (
    <IconContainer>
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
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
  );
};

const IconContainer: React.FC = ({ children }) => {
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
  );
};
