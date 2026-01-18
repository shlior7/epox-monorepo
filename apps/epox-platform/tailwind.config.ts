import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // =================================================================
      // COLORS
      // =================================================================
      colors: {
        // Semantic colors using CSS variables
        border: 'hsl(var(--border))',
        'border-subtle': 'hsl(var(--border-subtle))',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        'background-alt': 'hsl(var(--background-alt))',
        'background-deep': 'hsl(var(--background-deep))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        warm: {
          DEFAULT: 'hsl(var(--warm))',
          foreground: 'hsl(var(--warm-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Extended palette - Neutral grays (matching scenergy-visualizer)
        neutral: {
          950: '#0f0f0f', // Deepest background
          900: '#171717', // Main background / input bg
          850: '#1a1a1a', // App background
          800: '#262626', // Card/surface background
          750: '#2a2a2a', // Elevated surfaces
          700: '#333333', // Borders, strong surfaces
          600: '#404040', // Muted borders
          500: '#525252', // Disabled state
          400: '#737373', // Muted text
          300: '#a3a3a3', // Secondary text
          200: '#d4d4d4', // Primary text
          100: '#e5e5e5', // Bright text
          50: '#f5f5f5',  // White-ish
        },
        // Legacy charcoal alias
        charcoal: {
          950: '#0f0f0f',
          900: '#171717',
          850: '#1a1a1a',
          800: '#262626',
          750: '#2a2a2a',
          700: '#333333',
          600: '#404040',
          500: '#525252',
          400: '#737373',
          300: '#a3a3a3',
          200: '#d4d4d4',
          100: '#e5e5e5',
          50: '#f5f5f5',
        },
        indigo: {
          950: '#1e1b4b',
          900: '#312e81',
          800: '#3730a3',
          700: '#4338ca',
          600: '#4f46e5',
          500: '#6366f1',
          400: '#818cf8',
          300: '#a5b4fc',
          200: '#c7d2fe',
          100: '#e0e7ff',
          50: '#eef2ff',
        },
        cyan: {
          950: '#083344',
          900: '#164e63',
          800: '#155e75',
          700: '#0e7490',
          600: '#0891b2',
          500: '#06b6d4',
          400: '#22d3ee',
          300: '#67e8f9',
          200: '#a5f3fc',
          100: '#cffafe',
          50: '#ecfeff',
        },
        amber: {
          950: '#451a03',
          900: '#78350f',
          800: '#92400e',
          700: '#b45309',
          600: '#d97706',
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
          200: '#fde68a',
          100: '#fef3c7',
          50: '#fffbeb',
        },
        emerald: {
          950: '#022c22',
          900: '#064e3b',
          800: '#065f46',
          700: '#047857',
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
          300: '#6ee7b7',
          200: '#a7f3d0',
          100: '#d1fae5',
          50: '#ecfdf5',
        },
        rose: {
          950: '#4c0519',
          900: '#881337',
          800: '#9f1239',
          700: '#be123c',
          600: '#e11d48',
          500: '#f43f5e',
          400: '#fb7185',
          300: '#fda4af',
          200: '#fecdd3',
          100: '#ffe4e6',
          50: '#fff1f2',
        },
      },

      // =================================================================
      // BORDER RADIUS
      // =================================================================
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 16px)',
      },

      // =================================================================
      // TYPOGRAPHY
      // =================================================================
      fontFamily: {
        sans: ['var(--font-roboto)', 'Roboto', 'Arial', 'sans-serif'],
        display: ['var(--font-roboto)', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'Roboto Mono', 'Consolas', 'Monaco', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        base: ['1rem', { lineHeight: '1.5rem' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.875rem' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      },

      // =================================================================
      // SPACING EXTENSIONS
      // =================================================================
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },

      // =================================================================
      // BOX SHADOWS
      // =================================================================
      boxShadow: {
        'glow-sm': '0 0 10px hsla(var(--primary), 0.2)',
        glow: '0 0 20px hsla(var(--primary), 0.25), 0 0 40px hsla(var(--primary), 0.1)',
        'glow-lg': '0 0 30px hsla(var(--primary), 0.35), 0 0 60px hsla(var(--primary), 0.15)',
        'glow-accent': '0 0 20px hsla(var(--accent), 0.3), 0 0 40px hsla(var(--accent), 0.1)',
        'glow-warm': '0 0 20px hsla(var(--warm), 0.3), 0 0 40px hsla(var(--warm), 0.1)',
        'glow-success': '0 0 20px hsla(var(--success), 0.3)',
        'inner-light': 'inset 0 1px 0 0 hsla(0, 0%, 100%, 0.05)',
        card: '0 4px 6px -1px hsla(var(--shadow-color), 0.1), 0 2px 4px -2px hsla(var(--shadow-color), 0.1)',
        'card-hover':
          '0 10px 15px -3px hsla(var(--shadow-color), 0.15), 0 4px 6px -4px hsla(var(--shadow-color), 0.1)',
        elevated:
          '0 20px 25px -5px hsla(var(--shadow-color), 0.2), 0 8px 10px -6px hsla(var(--shadow-color), 0.1)',
      },

      // =================================================================
      // BACKGROUND IMAGES
      // =================================================================
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-aurora':
          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 25%, #06b6d4 75%, #22d3ee 100%)',
        'gradient-premium': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
        'gradient-surface':
          'linear-gradient(180deg, hsla(var(--primary), 0.08) 0%, transparent 100%)',
        'gradient-glow':
          'radial-gradient(ellipse at center, hsla(var(--primary), 0.15) 0%, transparent 70%)',
      },

      // =================================================================
      // BACKDROP BLUR
      // =================================================================
      backdropBlur: {
        xs: '2px',
      },

      // =================================================================
      // ANIMATIONS
      // =================================================================
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px hsla(var(--primary), 0.2)' },
          '50%': { boxShadow: '0 0 40px hsla(var(--primary), 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.4s ease-out forwards',
        shimmer: 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },

      // =================================================================
      // TRANSITION
      // =================================================================
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },

      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // =================================================================
      // Z-INDEX
      // =================================================================
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
