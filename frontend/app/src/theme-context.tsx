import * as React from 'react';

import useLocalStorage from './localstorage';

export const THEME_DARK: THEME = 'theme-dark';
export const THEME_LIGHT: THEME = 'theme-light';

export type THEME = 'theme-dark' | 'theme-light';

export type ThemeContextValueType = {
  theme: THEME;
  toggleTheme?: () => void;
};

const initialValue: ThemeContextValueType = {
  theme: THEME_LIGHT,
};

export const ThemeContext = React.createContext<ThemeContextValueType>(
  initialValue,
);

export interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: THEME;
  toggleTheme?: () => void;
}

export function ThemeProvider(props: ThemeProviderProps) {
  const [theme, setTheme] = useLocalStorage<THEME>({
    key: 'MINTTER_THEME',
    initialValue: props.theme || THEME_LIGHT,
  });

  const toggleTheme = React.useCallback(() => {
    setTheme((prevTheme: THEME) =>
      prevTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT,
    );
  }, [setTheme]);

  const value = {
    theme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value} {...props} />;
}

export function useTheme() {
  const context = React.useContext<ThemeContextValueType>(ThemeContext);
  if (context === undefined) {
    throw new Error(`useTheme must be used within a ThemeProvider`);
  }

  return context;
}
