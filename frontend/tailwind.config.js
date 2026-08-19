/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Taktik qora fon + skin-rarity ranglari
        ink: "#0B0D10",
        surface: "#14171C",
        surface2: "#1B1F26",
        line: "#252A32",
        text: "#E9EDF1",
        muted: "#8B93A0",
        gold: "#FFB020",   // kovert/oltin skin rangi — asosiy aksent
        blue: "#4C8EFF",   // Steam ko'k rangi — ikkinchi aksent
        danger: "#EB4B4B",
        success: "#3BD671",
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      clipPath: {
        octagon:
          "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      },
    },
  },
  plugins: [],
};
