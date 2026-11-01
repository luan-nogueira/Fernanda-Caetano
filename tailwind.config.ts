import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#07152B",
          50: "#F0F4F8",
          100: "#D9E2EC",
          200: "#BCCCDC",
          300: "#9FB3C8",
          400: "#829AB1",
          500: "#627D98",
          600: "#486581",
          700: "#334E68",
          800: "#102A43",
          900: "#07152B",
          950: "#040C1A",
        },
        terracotta: {
          DEFAULT: "#D97732",
          light: "#E68F50",
          dark: "#B85E1E",
          50: "#FDF6F0",
          100: "#FAE8D8",
          200: "#F4CFB0",
          500: "#D97732",
          600: "#C06221",
          700: "#9E4E18",
        },
        offwhite: {
          DEFAULT: "#F7F5F1",
          pure: "#FFFFFF",
          warm: "#EFECE6",
          border: "#E5E0D8",
        },
        gold: {
          DEFAULT: "#C5A46D",
          light: "#DBC296",
          dark: "#A3834D",
          50: "#FBF8F1",
          100: "#F4ECE0",
        },
        slate: {
          DEFAULT: "#64748B",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        luxury: "0 10px 30px -10px rgba(7, 21, 43, 0.08)",
        "luxury-hover": "0 18px 36px -12px rgba(7, 21, 43, 0.14)",
        card: "0 4px 20px -2px rgba(7, 21, 43, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;

