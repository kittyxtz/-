import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: 'index.html', profile: 'profile.html', meetings: 'meetings.html', auth: 'auth.html', guest: 'guest.html', chats: 'chats.html', meeting: 'meeting.html' },
    },
  },
});
