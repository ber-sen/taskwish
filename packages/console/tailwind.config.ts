import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: false,
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        action: "var(--shadow)",
      },
      colors: {
        panelbg: "hsl(var(--panelbg))",
        "neutral-400": "hsl(var(--neutral-400))",
        "neutral-200": "hsl(var(--neutral-200))",
        border: "hsl(var(--border))",
        action: "hsl(var(--action))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "neutral-background": "hsl(var(--neutral-background))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "landing-primary": "#00DFA3",
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
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant("mini-app", "body.mini-app &");
    }),
  ],
};
