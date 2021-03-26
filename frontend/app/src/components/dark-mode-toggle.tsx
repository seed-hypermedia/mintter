import { useTheme } from '@mintter/ui/theme';
import { Box } from '@mintter/ui/box';
import { Text } from '@mintter/ui/text';

export const DarkModeToggle: React.FC = () => {
  const { currentTheme, toggle } = useTheme();

  return (
    <Box
      as="label"
      css={{
        alignItems: 'center',
        bottom: '$xl',
        display: 'flex',
        position: 'fixed',
        right: '$xl',
      }}
    >
      <Text variant="tiny" css={{ color: '$palette-gray-900' }}>
        Dark Mode
      </Text>
      <input
        type="checkbox"
        checked={currentTheme === 'dark'}
        onChange={toggle}
      />
    </Box>
  );
};
