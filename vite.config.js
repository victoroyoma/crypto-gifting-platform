import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto'],
    }),
  ],
  resolve: {
    alias: {
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ethers: ['ethers'],
          solana: ['@solana/web3.js'],
          helia: ['helia', '@helia/unixfs', 'blockstore-core'],
          ui: ['react-hot-toast', 'qrcode.react', '@lottiefiles/react-lottie-player'],
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
