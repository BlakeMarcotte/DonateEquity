import type { Config } from 'tailwindcss'

/**
 * Equity Compass - Professional Tailwind Configuration
 * Implements the complete Equity Compass styling guide
 * Optimized for financial platform applications
 */
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base colors - Equity Compass specification
        border: "hsl(214.3 31.8% 91.4%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(222.2 84% 4.9%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 84% 4.9%)",
        
        // Primary (Dark blue) - Professional brand color
        primary: {
          DEFAULT: "hsl(222.2 47.4% 11.2%)",
          foreground: "hsl(210 40% 98%)",
        },
        
        // Secondary (Light gray) - Supporting actions
        secondary: {
          DEFAULT: "hsl(210 40% 96%)",
          foreground: "hsl(222.2 84% 4.9%)",
        },
        
        // Destructive (Red) - Error and delete actions
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(210 40% 98%)",
        },
        
        // Muted (Light gray) - Subtle backgrounds
        muted: {
          DEFAULT: "hsl(210 40% 96%)",
          foreground: "hsl(215.4 16.3% 46.9%)",
        },
        
        // Accent (Light gray) - Hover states
        accent: {
          DEFAULT: "hsl(210 40% 96%)",
          foreground: "hsl(222.2 84% 4.9%)",
        },
        
        // Popover - Dropdown and modal backgrounds
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222.2 84% 4.9%)",
        },
        
        // Card - Content container backgrounds
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(222.2 84% 4.9%)",
        },

        // Status colors for badges and indicators
        yellow: {
          100: "hsl(54 91% 91%)",
          800: "hsl(45 83% 36%)",
          200: "hsl(52 98% 83%)",
        },
        green: {
          100: "hsl(142 69% 91%)",
          800: "hsl(158 64% 25%)",  
          200: "hsl(141 84% 77%)",
          50: "hsl(138 76% 97%)",
          600: "hsl(142 71% 45%)",
        },
        blue: {
          100: "hsl(214 95% 93%)",
          800: "hsl(213 94% 25%)",
          200: "hsl(213 97% 87%)",
          50: "hsl(214 100% 97%)",
          500: "hsl(217 91% 60%)",
          600: "hsl(221 83% 53%)",
          700: "hsl(224 76% 48%)",
        },
        red: {
          100: "hsl(0 93% 94%)",
          800: "hsl(0 75% 42%)",
          200: "hsl(0 96% 89%)",
          50: "hsl(0 86% 97%)",
          600: "hsl(0 72% 51%)",
        },
        gray: {
          50: "hsl(210 40% 98%)",
          100: "hsl(210 40% 96%)",
          200: "hsl(214.3 31.8% 91.4%)",
          300: "hsl(213 27% 84%)",
          400: "hsl(215 20% 65%)",
          500: "hsl(215 16% 47%)",
          600: "hsl(215 19% 35%)",
          700: "hsl(215 25% 27%)",
          800: "hsl(217 33% 17%)",
          900: "hsl(222.2 84% 4.9%)",
        },
        
        // Authentication page specific colors
        'auth-dark': '#011D28', // Left panel background
        
        // Status badge colors
        purple: {
          50: "hsl(270 100% 98%)",
          200: "hsl(269 100% 86%)",
          800: "hsl(272 77% 28%)",
        },
      },
      
      // Professional border radius system
      borderRadius: {
        lg: "0.5rem",    // 8px - Standard for buttons, cards
        md: "calc(0.5rem - 2px)",  // 6px
        sm: "calc(0.5rem - 4px)",  // 4px
      },
      
      // Font family - Inter from Google Fonts
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      
      // Professional animations
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      
      // Enhanced shadow system
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config