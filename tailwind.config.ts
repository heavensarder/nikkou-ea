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
        primary: {
          DEFAULT: "#ff2d32",
          hover: "#e02227",
          light: "#fff1f2",
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#ff2d32",
          600: "#e02227",
          700: "#be181d",
        },
        secondary: {
          DEFAULT: "#2c4c80",
          hover: "#223c66",
          light: "#eef3f9",
          50: "#f2f6fb",
          100: "#e2ebf6",
          500: "#2c4c80",
          600: "#223c66",
          700: "#1a2f52",
          800: "#13233e",
          900: "#0d182b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
