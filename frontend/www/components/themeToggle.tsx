type Props = {
  isDark: boolean
  toggle: (e: any) => void
}

// Adapted from: https://codepen.io/aaroniker/pen/KGpXZo and https://github.com/narative/gatsby-theme-novela/blob/master/%40narative/gatsby-theme-novela/src/components/Navigation/Navigation.Header.tsx

export default function ThemeToggle({isDark, toggle}: Props) {
  return (
    <button
      onClick={toggle}
      type="button"
      aria-label={isDark ? `Activate Light Mode` : `Activate Dark Mode`}
      title={isDark ? `Activate Light Mode` : `Activate Dark Mode`}
      className="relative rounded-md flex items-center justify-center transition outline-none cursor-pointer p-0 appearance-none hover:opacity-100 focus:opacity-100 opacity-50 w-24 h-16"
    >
      <div
        className={`theme-toggle relative w-16 h-16 rounded-full transition ${
          isDark
            ? 'border-danger border-4 border-solid bg-danger-hover scale-50 overflow-visible shadow-none'
            : 'border-none bg-transparent scale-100 overflow-hidden shadow-inner'
        }`}
        // boxShadow: t => `0 -23px 0 ${t.colors.toggleIcon}, 0 23px 0 ${t.colors.toggleIcon}, 23px 0 0 ${t.colors.toggleIcon}, -23px 0 0 ${t.colors.toggleIcon}, 15px 15px 0 ${t.colors.toggleIcon}, -15px 15px 0 ${t.colors.toggleIcon}, 15px -15px 0 ${t.colors.toggleIcon}, -15px -15px 0 ${t.colors.toggleIcon}`,
      />
      <style jsx>{`
        .theme-toggle:before {
          content: '""';
          position: absolute;
          right: -9px;
          top: -9px;
          height: 24px;
          width: 24px;
          border: ${isDark ? '2px solid red' : 'none'};
          border-radius: 50%;
          transform: ${isDark ? `translate(14px, -14px)` : `translate(0, 0)`};
          opacity: ${isDark ? 0 : 1};
          transition: transform 0.45s ease;
        }
        .theme-toggle:after {
          content: '""';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin: -4px 0 0 -4px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: ${isDark ? `scale(1)` : `scale(0)`};
          transition: all 0.35s ease;
        }
      `}</style>
    </button>
  )
}
