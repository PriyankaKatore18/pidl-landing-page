/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./main.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#000000",
          panel: "#0D0D0D",
          accent: "#111111",
          gold: "#EFA92A",
          "gold-dark": "#C8860D",
          text: "#FFFFFF",
          "text-secondary": "#B0B0B0",
          "text-muted": "#666666",
          success: "#22C55E",
          danger: "#EF4444",
          border: "rgba(239,169,42,0.15)",
          "border-strong": "rgba(239,169,42,0.4)",
        },
      },
      fontFamily: {
        heading: ["Poppins", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 12px 40px rgba(239,169,42,0.16)",
      },
    },
  },
  plugins: [],
};
