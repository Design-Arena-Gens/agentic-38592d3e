import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B1F3B",
          foreground: "#F4F4F6"
        },
        accent: "#C8AA6E"
      },
      fontFamily: {
        display: ["'Inter'", "sans-serif"],
        body: ["'Inter'", "sans-serif"]
      },
      boxShadow: {
        brand: "0 25px 50px -12px rgba(27, 31, 59, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
