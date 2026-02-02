/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "shrink-width": {
          "0%": { width: "100%" },
          "100%": { width: "0%" },
        },
      },

      animation: {
        "shrink-width": "shrink-width linear forwards",
      },
    },
  },
  plugins: [],
};
