/** @type {import('tailwindcss').Config} */
export default {
  // Lista de arquivos onde o Tailwind deve buscar classes (essencial para o build)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Opcional: define a fonte Inter como padrão
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Aqui você pode estender cores, tamanhos, etc., se necessário.
    },
  },
  plugins: [],
}
