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
        dashboard: resolve(__dirname, 'admin/dashboard.html'),
        courses: resolve(__dirname, 'admin/courses.html'),
        students: resolve(__dirname, 'admin/students.html'),
        enrollments: resolve(__dirname, 'admin/enrollments.html'),
        portal: resolve(__dirname, 'student/portal.html'),
      }
    }
  }
});
