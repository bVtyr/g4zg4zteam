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
        ink: "#140b3e",
        royal: "#17076d",
        aqua: "#d5c08a",
        sand: "#f4efe4",
        success: "#1f7a5a",
        warning: "#b7791f",
        danger: "#b64d4d",
        info: "#51627f"
      },
      boxShadow: {
        panel: "0 8px 22px rgba(15, 27, 61, 0.06)",
        sidebar: "0 18px 36px rgba(9, 16, 42, 0.14)"
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "sans-serif"],
        display: ["Trebuchet MS", "Segoe UI", "sans-serif"]
      },
      backgroundImage: {
        grain:
          "linear-gradient(180deg, #f6f3ec 0%, #f1eee7 100%)"
      }
    }
  },
  plugins: []
};

export default config;
