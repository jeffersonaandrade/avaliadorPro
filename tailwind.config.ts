import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        muted: {
          foreground: "#64748b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
