const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  getAuthToken: () => ipcRenderer.invoke('get-auth-token'),
  setAuthToken: (token) => ipcRenderer.invoke('set-auth-token', token),
  
  // Recording
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  uploadRecording: (data) => ipcRenderer.invoke('upload-recording', data),

  saveRecordingLocal: (data) => ipcRenderer.invoke('save-recording-local', data),
  
  // Multipart upload methods
  startMultipartUpload: (data) => ipcRenderer.invoke('start-multipart-upload', data),
  generatePresignedUrls: (data) => ipcRenderer.invoke('generate-presigned-urls', data),
  uploadPart: (data) => ipcRenderer.invoke('upload-part', data),
  completeMultipartUpload: (data) => ipcRenderer.invoke('complete-multipart-upload', data),
  
  // Screen capture
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  
  // App control
  forceStopRecording: () => ipcRenderer.invoke('force-stop-recording'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // External links
  openExternalLink: (url) => ipcRenderer.invoke('open-external-link', url),
  
  // Recording overlay
  showRecordingOverlay: () => ipcRenderer.invoke('show-recording-overlay'),
  hideRecordingOverlay: () => ipcRenderer.invoke('hide-recording-overlay'),
  updateOverlayTimer: (seconds) => ipcRenderer.invoke('update-overlay-timer', seconds),
  stopRecordingFromOverlay: () => ipcRenderer.invoke('stop-recording-from-overlay'),
  
  // Event listeners
  onRecordingTimerUpdate: (callback) => {
    ipcRenderer.on('recording-timer-update', (event, seconds) => callback(seconds));
  },
  
  onTimerUpdate: (callback) => {
    ipcRenderer.on('timer-update', (event, seconds) => callback(seconds));
  },
  
  onStopRecordingFromOverlay: (callback) => {
    ipcRenderer.on('stop-recording-from-overlay', () => callback());
  },
  
  onRecordingStopped: (callback) => {
    ipcRenderer.on('recording-stopped', () => callback());
  },
  
  onScreenSourcesAvailable: (callback) => {
    ipcRenderer.on('screen-sources-available', (event, sources) => callback(sources));
  },
  
  onShowRecordingWarning: (callback) => {
    ipcRenderer.on('show-recording-warning', () => callback());
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
}); 