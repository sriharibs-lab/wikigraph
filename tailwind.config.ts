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
        background: "#FAFAF9",
        foreground: "#1A1A1A",
        muted: "#8E8E93",
        light: "#AEAEB2",
        border: "rgba(0,0,0,0.06)",
        node: {
          people: "#B8D4E3",
          "people-stroke": "#89B4CE",
          place: "#B8E3C8",
          "place-stroke": "#7CC99A",
          concept: "#D4B8E3",
          "concept-stroke": "#B48CCC",
          event: "#E3D4B8",
          "event-stroke": "#CCBA8C",
          science: "#B8C8E3",
          "science-stroke": "#8CA4CC",
          art: "#E3B8C8",
          "art-stroke": "#CC8CA4",
          organization: "#C8E3E3",
          "organization-stroke": "#8CCCCC",
          other: "#D5D5DA",
          "other-stroke": "#AEAEB2",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Helvetica",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "16px",
        chip: "20px",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(0,0,0,0.06)",
        glass: "0 2px 12px rgba(0,0,0,0.04)",
      },
      backdropBlur: {
        glass: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
