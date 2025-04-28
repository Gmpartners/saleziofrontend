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
    'bg-[#10b981]',
    'bg-[#059669]',
    'text-[#10b981]',
    'text-[#34d399]',
    'border-[#10b981]',
    'border-[#059669]',
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
          faint: '#0B1812',
          muted: colors.emerald[900],
          subtle: colors.emerald[800],
          DEFAULT: colors.emerald[600],
          emphasis: colors.emerald[400],
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
            faint: '#0B1812',
            muted: colors.emerald[950],
            subtle: colors.emerald[800],
            DEFAULT: colors.emerald[600],
            emphasis: colors.emerald[400],
            inverted: colors.slate[950],
          },
          border: {
            DEFAULT: 'rgba(31, 41, 55, 0.4)',
          },
          ring: {
            DEFAULT: 'rgba(16, 185, 129, 0.5)',
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
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.3)',
        'glow-green-lg': '0 0 25px rgba(16, 185, 129, 0.4)',
        'button': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(16, 185, 129, 0.1)',
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
          '0%, 100%': { boxShadow: '0 0 4px rgba(16, 185, 129, 0.2)' },
          '50%': { boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)' },
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
        
        // Animações refinadas
        "pulse-slow": 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        "float": 'float 5s ease-in-out infinite',
        "scale-in": 'scale-in 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards',
        "fade-in-left": 'fade-in-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        "fade-in-right": 'fade-in-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        "glow-pulse": 'glow-pulse 2.5s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #10b981, #059669)',
        'gradient-card': 'linear-gradient(to bottom, rgba(15, 23, 42, 0.95), rgba(7, 11, 17, 0.98))',
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
        '.bg-gradient-primary': {
          'background-image': 'linear-gradient(to right, var(--tw-gradient-stops))',
          '--tw-gradient-from': '#10b981',
          '--tw-gradient-to': '#059669',
          '--tw-gradient-stops': 'var(--tw-gradient-from), var(--tw-gradient-to)',
        },
        '.text-gradient': {
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'color': 'transparent',
        },
        '.bg-dark-card': {
          'background-color': 'rgba(15, 23, 42, 0.6)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(31, 41, 55, 0.4)',
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
      });
    },
  ],
};