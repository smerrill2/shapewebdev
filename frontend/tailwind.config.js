/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './app/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  safelist: [
    // Exact patterns for arbitrary values
    { 
      pattern: /bg-\[#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\]/,
      variants: ['hover', 'focus', 'active', 'dark']
    },
    { 
      pattern: /text-\[#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\]/,
      variants: ['hover', 'focus', 'active', 'dark']
    },
    { 
      pattern: /border-\[#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\]/,
      variants: ['hover', 'focus', 'active', 'dark']
    },
    
    // Interactive states for all colors
    {
      pattern: /(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[1-9]00/,
      variants: ['hover', 'focus', 'active', 'dark', 'dark:hover', 'dark:focus', 'dark:active']
    },
    
    // Background patterns
    {
      pattern: /bg-\[url\(.+?\)\]/,
    },
    {
      pattern: /bg-(cover|contain|auto|none)/,
    },
    {
      pattern: /bg-(center|top|bottom|left|right)/,
    },
    
    // Enhanced gradient patterns
    {
      pattern: /bg-gradient-to-(r|l|t|b|tr|tl|br|bl)/,
    },
    {
      pattern: /bg-\[linear-gradient\(.+?\)\]/,
    },
    {
      pattern: /bg-\[radial-gradient\(.+?\)\]/,
    },
    {
      pattern: /(from|via|to)-\[.+?\]/,
      variants: ['hover', 'focus', 'dark']
    },
    {
      pattern: /from-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[1-9]00/,
    },
    {
      pattern: /to-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[1-9]00/,
    },
    {
      pattern: /via-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[1-9]00/,
    },
    
    // Special values
    'to-black',
    'to-white',
    'from-black',
    'from-white',
    'via-black',
    'via-white',
    
    // Component-specific classes
    {
      pattern: /ring-(0|1|2|4|8)$/,
      variants: ['focus', 'focus-visible', 'dark']
    },
    {
      pattern: /ring-offset-(0|1|2|4|8)$/,
      variants: ['focus', 'focus-visible', 'dark']
    },
    {
      pattern: /ring-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[1-9]00/,
      variants: ['focus', 'focus-visible', 'dark']
    },
    
    // Opacity utilities
    { pattern: /opacity-\d+/ },

    // Additional styling patterns
    {
      pattern: /(m|p|gap|space)-(x|y)?-\[.+?\]/,
    },
    {
      pattern: /(w|h|min-w|min-h|max-w|max-h)-\[.+?\]/,
    },
    {
      pattern: /(top|right|bottom|left)-\[.+?\]/,
    },
    {
      pattern: /rounded(-[trbl][rl])?-\[.+?\]/,
    },
    
    // Interactive and state classes
    {
      pattern: /pointer-events-(none|auto)/,
    },
    {
      pattern: /select-(none|text|all|auto)/,
    },
    {
      pattern: /disabled:opacity-\d+/,
    }
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' }
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        typing: "typing 1.5s steps(40, end)",
        'cursor-blink': 'blink 1s step-end infinite',
        shimmer: "shimmer 2s ease-in-out infinite",
        'fade-up': 'fade-up 0.5s ease-out',
        'fade-down': 'fade-down 0.5s ease-out',
        'slide-in-right': 'slide-in-from-right 0.5s ease-out',
        'slide-in-left': 'slide-in-from-left 0.5s ease-out'
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 