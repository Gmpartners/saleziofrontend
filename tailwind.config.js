import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  // Ativando o Just-In-Time mode para melhor performance
  mode: 'jit',
  // Safelist para classes dinâmicas importantes
  safelist: [
    // Classes fundamentais que podem ser geradas dinamicamente
    'bg-[#FF8F00]',
    'bg-[#FF6F00]',
    'text-[#FF8F00]',
    'text-[#FFCA28]',
    'border-[#FF8F00]',
    'border-[#FF6F00]',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ABCGravityFallback', 'sans-serif']
      },
      colors: {
        tremor: {
          faint: '#121212',
          muted: colors.amber[900],
          subtle: colors.amber[800],
          DEFAULT: colors.amber[600],
          emphasis: colors.amber[400],
          inverted: colors.slate[950],
        },
        border: {
          DEFAULT: "hsl(var(--border))",
        },
        input: {
          DEFAULT: "hsl(var(--input))",
        },
        ring: {
          DEFAULT: "hsl(var(--ring))",
        },
        background: {
          DEFAULT: "hsl(var(--background))",
        },
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
        },
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
        content: {
          subtle: colors.slate[400],
          DEFAULT: colors.slate[300],
          emphasis: colors.slate[200],
          strong: colors.slate[50],
          inverted: colors.slate[950],
        },
        'dark-tremor': {
          brand: {
            faint: '#121212',
            muted: colors.amber[950],
            subtle: colors.amber[800],
            DEFAULT: colors.amber[600],
            emphasis: colors.amber[400],
            inverted: colors.slate[950],
          },
          border: {
            DEFAULT: 'rgba(31, 41, 55, 0.4)',
          },
          ring: {
            DEFAULT: 'rgba(255, 143, 0, 0.5)',
          },
          content: {
            subtle: colors.slate[600],
            DEFAULT: colors.slate[500],
            emphasis: colors.slate[200],
            strong: colors.slate[50],
            inverted: colors.slate[950],
          },
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        // Firebase-themed colors
        firebase: {
          orange: {
            light: '#FFCA28',
            DEFAULT: '#FF8F00',
            dark: '#FF6F00',
          },
          yellow: {
            light: '#FFECB3',
            DEFAULT: '#FFC107',
            dark: '#FF8F00',
          },
          black: {
            light: '#212121',
            DEFAULT: '#121212',
            dark: '#000000',
          },
          gray: {
            light: '#BDBDBD',
            DEFAULT: '#757575',
            dark: '#424242',
          }
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'tremor-small': '0.375rem',
        'tremor-default': '0.5rem',
        'tremor-full': '9999px',
        'none': '0',
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      boxShadow: {
        'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'dark-tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'dark-tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'glow-orange': '0 0 15px rgba(255, 143, 0, 0.3)',
        'glow-orange-lg': '0 0 25px rgba(255, 143, 0, 0.4)',
        'button': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(255, 143, 0, 0.1)',
        'panel': '0 8px 16px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
        'panel-hover': '0 10px 25px rgba(0, 0, 0, 0.25), 0 2px 5px rgba(0, 0, 0, 0.15)',
      },
      fontSize: {
        'tremor-label': ['0.75rem', { lineHeight: '1rem' }],
        'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
        'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
        'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      keyframes: {
        // Base keyframes
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fadeIn": {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        "fadeInUp": {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        "fadeInDown": {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        "shimmer": {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        "spin": {
          to: { transform: 'rotate(360deg)' }
        },
        "flame": {
          '0%, 100%': { 
            transform: 'scale(1) translateY(0)',
            opacity: '0.8',
            filter: 'brightness(1)'
          },
          '50%': { 
            transform: 'scale(1.05) translateY(-5px)',
            opacity: '1',
            filter: 'brightness(1.2)'
          },
        },
        
        // Animações refinadas
        "pulse-slow": {
          '0%, 100%': { opacity: '0.8' },
          '50%': { opacity: '1' },
        },
        "float": {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        "scale-in": {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        "fade-in-left": {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        "fade-in-right": {
          '0%': { transform: 'translateX(10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        "glow-pulse": {
          '0%, 100%': { boxShadow: '0 0 4px rgba(255, 143, 0, 0.2)' },
          '50%': { boxShadow: '0 0 12px rgba(255, 143, 0, 0.4)' },
        },
      },
      animation: {
        // Animações base
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fadeIn": 'fadeIn 0.6s ease-out forwards',
        "fadeInUp": 'fadeInUp 0.7s ease-out forwards',
        "fadeInDown": 'fadeInDown 0.7s ease-out forwards',
        "shimmer": 'shimmer 2.2s linear infinite',
        "flame": 'flame 3s ease-in-out infinite',
        
        // Animações refinadas
        "pulse-slow": 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        "float": 'float 5s ease-in-out infinite',
        "scale-in": 'scale-in 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards',
        "fade-in-left": 'fade-in-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        "fade-in-right": 'fade-in-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        "glow-pulse": 'glow-pulse 2.5s ease-in-out infinite',
        "spin-slow": 'spin 3s linear infinite',
      },
      backgroundImage: {
        'gradient-firebase': 'linear-gradient(to right, #FF8F00, #FF6F00)',
        'gradient-card': 'linear-gradient(to bottom, rgba(18, 18, 18, 0.95), rgba(0, 0, 0, 0.98))',
        'gradient-orange': 'linear-gradient(135deg, #FF8F00, #FF6F00)',
        'gradient-dark': 'linear-gradient(180deg, #212121, #121212)',
      }
    },
  },
  future: {
    // Recursos futuros do Tailwind para melhor otimização
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
    hoverOnlyWhenSupported: true,
  },
  plugins: [
    require("tailwindcss-animate"),
    // Função para reduzir o tamanho do CSS resultante
    function({ addBase, addUtilities }) {
      // Adiciona apenas utilitários essenciais customizados aqui
      addUtilities({
        '.bg-gradient-firebase': {
          'background-image': 'linear-gradient(to right, var(--tw-gradient-stops))',
          '--tw-gradient-from': '#FF8F00',
          '--tw-gradient-to': '#FF6F00',
          '--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to)',
        },
        '.text-gradient': {
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'color': 'transparent',
        },
        '.bg-dark-card': {
          'background-color': 'rgba(18, 18, 18, 0.6)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(37, 37, 37, 0.4)',
        },
        '.backdrop-blur-card': {
          'backdrop-filter': 'blur(12px)',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            'display': 'none',
          },
        },
        '.firebase-shadow': {
          'box-shadow': '0 4px 12px rgba(255, 143, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.2)'
        },
        '.text-shadow-fire': {
          'text-shadow': '0 1px 3px rgba(255, 143, 0, 0.3)'
        }
      });
    },
  ],
};