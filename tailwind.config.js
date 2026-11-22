/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // shadcn tokens from src/index.css; `<alpha-value>` keeps opacity modifiers (bg-muted/50) working.
      colors: {
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        primary: "hsl(var(--primary) / <alpha-value>)",
      },
    },
  },
  plugins: [],
}
