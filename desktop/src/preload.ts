import { contextBridge } from 'electron';

// Expose nothing sensitive — the renderer talks to the backend via HTTP.
// Add IPC bridges here only when needed.
contextBridge.exposeInMainWorld('electron', {
  isDesktop: true,
  platform: process.platform,
});
