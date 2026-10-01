import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // relatif, supaya hasil build bisa di-hosting di subfolder mana pun
  base: './',
});
