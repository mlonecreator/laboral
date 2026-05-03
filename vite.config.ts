import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        courses: resolve(__dirname, 'courses.html'),
        students: resolve(__dirname, 'students.html'),
        enrollments: resolve(__dirname, 'enrollments.html'),
        portal: resolve(__dirname, 'student/portal.html'),
      }
    }
  }
});
