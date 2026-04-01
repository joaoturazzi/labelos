import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        text: "var(--text)",
        text2: "var(--text2)",
        text3: "var(--text3)",
        text4: "var(--text4)",
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        border: "var(--border)",
        border2: "var(--border2)",
        "active-bg": "var(--active-bg)",
        success: "var(--success)",
        "success-bg": "var(--success-bg)",
        warning: "var(--warning)",
        "warning-bg": "var(--warning-bg)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
        neutral: "var(--neutral)",
        "neutral-bg": "var(--neutral-bg)",
      },
    },
  },
  plugins: [],
};

export default config;
