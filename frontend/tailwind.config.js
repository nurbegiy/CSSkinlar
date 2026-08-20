/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Taktik qora fon + CS2 haqiqiy rarity (noyoblik) rang tizimi
        ink: "#0A0C10",
        surface: "#12151B",
        surface2: "#1A1F27",
        surface3: "#212733",
        line: "#242A34",
        lineBright: "#343C4A",
        text: "#ECEFF3",
        muted: "#8891A0",
        gold: "#E4AF44",       // Covert/Knife — asosiy aksent
        blue: "#4B69FF",       // Mil-Spec
        purple: "#8847FF",     // Restricted
        pink: "#D32CE6",       // Classified
        red: "#EB4B4B",        // Covert / xato
        gray: "#9DA8B5",       // Consumer
        danger: "#EB4B4B",
        success: "#3BD671",
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      clipPath: {
        octagon:
          "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      },
      boxShadow: {
        goldGlow: "0 0 0 1px rgba(228,175,68,0.35), 0 8px 30px -6px rgba(228,175,68,0.35)",
        softGlow: "0 8px 30px -10px rgba(0,0,0,0.6)",
      },
      keyframes: {
        floatSlow: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        floatSlow: "floatSlow 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
