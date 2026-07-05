/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          blue: "#0E3B91",
          "blue-dark": "#082052",
          "blue-light": "#1e4cb8",
          orange: "#F87D0E",
          "orange-light": "#FFA94D",
          gold: "#C7A15B",
          "gold-light": "#E2C792",
          lotus: "#E88FC5",
          ink: "#0A0F24",
          paper: "#FAFAFA",
        },
      },
      fontFamily: {
        // Two-font system: Outfit for headings, DM Sans for body.
        // Legacy aliases are remapped to Outfit so existing class usage
        // keeps working without loading extra font families.
        sans: ["DM Sans", "system-ui", "sans-serif"],
        headline: ["Outfit", "sans-serif"],
        legacy: ["Outfit", "sans-serif"],
        playful: ["Outfit", "sans-serif"],
        display: ["Outfit", "sans-serif"],
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-8px) rotate(2deg)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 4s ease-in-out infinite",
        "float-slow": "float-slow 12s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "spin-slow": "spin-slow 22s linear infinite",
        "wiggle": "wiggle 1.6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      backgroundImage: {
        "hero-grad": "linear-gradient(135deg, rgba(14,59,145,0.06) 0%, rgba(248,125,14,0.05) 50%, rgba(232,143,197,0.08) 100%)",
        "section-grad": "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
        "preschool-grad": "linear-gradient(135deg, rgba(232,143,197,0.18) 0%, rgba(248,125,14,0.12) 50%, rgba(199,161,91,0.14) 100%)",
        "gold-grad": "linear-gradient(to right, #C7A15B, #E2C792)",
        "blue-grad": "linear-gradient(135deg, #0E3B91 0%, #1e4cb8 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
