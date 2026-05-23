/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Placeholder theme tokens — will be replaced with OpenDhi theme */
        primary: {
          50: "#fdf8f4",
          100: "#faf0e6",
          200: "#f4dbcc",
          300: "#ebbd9b",
          400: "#e09a63",
          500: "#c27a39",
          600: "#a6622b",
          700: "#8b4d1f",
          800: "#703a16",
          900: "#5a2d10",
        },
        surface: {
          light: "#faf9f6",
          dark: "#181816",
        },
        muted: {
          light: "#f5f4ef",
          dark: "#242422",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
