// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ¡Importante que cubra tus archivos de React!
  ],
  theme: {
    extend: {
      // Puedes añadir animaciones personalizadas aquí si quieres
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
        },
        'slide-in-right': {
            '0%': { transform: 'translateX(100%)', opacity: '0' },
            '100%': { transform: 'translateX(0)', opacity: '1' },
        }
      },
      animation: {
        'fade-in-down': 'fade-in-down 1s ease-out',
        'fade-in-up': 'fade-in-up 1s ease-out 0.5s', // Retraso
        'fade-in': 'fade-in 0.8s ease-out',
        'slide-in-right': 'slide-in-right 0.6s ease-out',
      }
    },
  },
  plugins: [],
}