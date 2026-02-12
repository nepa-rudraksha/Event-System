/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: "#C19A5B",
        goldLight: "#D4B584",
        cream: "#F8F6F2",
        creamDark: "#F0EDE5",
        textDark: "#2C2416",
        textMedium: "#5A5247",
        textLight: "#8B8375",
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'title': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'large': ['1.125rem', { lineHeight: '1.6' }],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(0,0,0,0.08)",
        medium: "0 4px 20px rgba(0,0,0,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem",
      },
    },
  },
  plugins: [],
};
