/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        celerity: {
          warmMist: "#E9E9D9",
          mint: "#C8E8D9",
          commerceGreen: "#65B99B",
          commerceGreenDark: "#4E9A7F",
          paleYellow: "#E8D58A",
          softGold: "#E8C86B",
          ivory: "#F8F8F3",
          carbon: "#101413",
          carbonLight: "#181E1C",
          deepForest: "#26352F",
          deepForestDark: "#1B2722",
          sage: "#A4B8AC",
          sageDark: "#7E9688",
          // High contrast navy / sapphire text anchor from the logo
          sapphire: "#0A2540",
          sapphireDark: "#06182B"
        }
      },
      fontFamily: {
        display: ['"Manrope"', '"Satoshi"', 'sans-serif'],
        sans: ['"Manrope"', 'sans-serif'],
        editorial: ['"Newsreader"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        wide: '0.04em',
        widest: '0.14em',
      },
      boxShadow: {
        'glass-mint': '0 20px 40px -15px rgba(101, 185, 155, 0.22), inset 0 1px 1px 0 rgba(255, 255, 255, 0.65)',
        'glass-gold': '0 20px 40px -15px rgba(232, 200, 107, 0.22), inset 0 1px 1px 0 rgba(255, 255, 255, 0.65)',
        'glass-clean': '0 25px 50px -12px rgba(16, 20, 19, 0.08), inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)',
        'dark-float': '0 30px 60px -15px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
      }
    },
  },
  plugins: [],
}
