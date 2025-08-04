const { app, BrowserWindow, ipcMain, desktopCapturer, session } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const config = require('./config');
const store = new Store();

let mainWindow;
let recordingWindow = null;
let recordingOverlayWindow = null;
let isRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 760,
    minWidth: 400,
    minHeight: 760,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      enableWebContents: true
    },
    icon: path.join(__dirname, 'assets', 'logo-class-capsule.png'),
    titleBarStyle: 'hidden',
    show: false,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#ffffff'
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window close
  mainWindow.on('close', (event) => {
    if (isRecording) {
      event.preventDefault();
      mainWindow.webContents.send('show-recording-warning');
    }
  });
}

function createRecordingOverlayWindow() {
  // Get screen dimensions
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Calculate position for bottom center
  const overlayWidth = 300;
  const overlayHeight = 80;
  const x = Math.round((screenWidth - overlayWidth) / 2);
  const y = Math.round(screenHeight - overlayHeight - 50); // 50px from bottom
  
  recordingOverlayWindow = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  recordingOverlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

  // Make window draggable
  recordingOverlayWindow.setMovable(true);

  recordingOverlayWindow.on('closed', () => {
    recordingOverlayWindow = null;
  });

  return recordingOverlayWindow;
}

// Handle app lifecycle
app.whenReady().then(() => {
  // Set permissions for screen capture and microphone
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Permission requested:', permission);
    const allowedPermissions = ['media', 'display-capture', 'desktop-capture', 'microphone'];
    if (allowedPermissions.includes(permission)) {
      console.log('Granting permission:', permission);
      callback(true);
    } else {
      console.log('Denying permission:', permission);
      callback(false);
    }
  });

  // macOS-specific setup for microphone permissions
  if (process.platform === 'darwin') {
    console.log('Setting up macOS-specific permissions...');
    
    // Request microphone permissions early
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      console.log('Permission requested:', permission);
      
      if (permission === 'microphone') {
        console.log('Microphone permission requested - granting automatically');
        callback(true);
      } else if (permission === 'media') {
        console.log('Media permission requested - granting for microphone access');
        callback(true);
      } else if (['display-capture', 'desktop-capture'].includes(permission)) {
        console.log('Screen capture permission requested - granting');
        callback(true);
      } else {
        console.log('Denying permission:', permission);
        callback(false);
      }
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for authentication
ipcMain.handle('get-auth-token', async () => {
  const token = store.get('authToken');
  return { success: true, token: token || null };
});

ipcMain.handle('set-auth-token', async (event, token) => {
  try {
    if (token === null) {
      store.delete('authToken');
    } else {
      store.set('authToken', token);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handlers for recording
ipcMain.handle('start-recording', async () => {
  try {
    if (isRecording) {
      return { success: false, error: 'Already recording' };
    }

    isRecording = true;
    recordingSeconds = 0;

    // Start timer
    recordingTimer = setInterval(() => {
      recordingSeconds++;
      mainWindow.webContents.send('recording-timer-update', recordingSeconds);
    }, 1000);

    // Get screen sources
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    });

    // Send sources to renderer
    mainWindow.webContents.send('screen-sources-available', sources);

    return { success: true };
  } catch (error) {
    isRecording = false;
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-recording', async () => {
  try {
    if (!isRecording) {
      return { success: false, error: 'Not recording' };
    }

    isRecording = false;
    
    // Clear timer
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    // Notify renderer
    mainWindow.webContents.send('recording-stopped');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handler for uploading recording
ipcMain.handle('upload-recording', async (event, { blobData, filename, apiUrl, authToken }) => {
  try {
    // Validate inputs
    if (!blobData) {
      throw new Error('Invalid recording data: Expected blobData');
    }

    console.log('Starting upload process...', { 
      hasBlobData: !!blobData, 
      filename: filename,
      apiUrl: apiUrl 
    });

    // Validate and convert base64 back to buffer
    console.log('Received blobData length:', blobData ? blobData.length : 'undefined');
    
    if (!blobData || typeof blobData !== 'string') {
      throw new Error('Invalid blobData: Expected non-empty string');
    }
    
    let buffer;
    try {
      buffer = Buffer.from(blobData, 'base64');
      console.log('Successfully converted base64 to buffer. Size:', buffer.length, 'bytes');
    } catch (base64Error) {
      console.error('Base64 decoding failed:', base64Error);
      throw new Error(`Base64 decoding failed: ${base64Error.message}`);
    }

    // Create FormData equivalent for Node.js
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', buffer, {
      filename: filename || `recording-${Date.now()}.webm`,
      contentType: 'video/webm'
    });

    // Prepare headers
    const headers = {
      ...formData.getHeaders()
    };

    const tokenToUse = authToken || store.get('authToken');
    
    if (tokenToUse && tokenToUse !== 'null' && tokenToUse !== 'undefined') {
      headers['Authorization'] = `Bearer ${tokenToUse}`;
      console.log('Using auth token:', tokenToUse.substring(0, 20) + '...');
    } else {
      console.log('No valid auth token available');
      throw new Error('No authentication token available. Please login first.');
    }

    // Send to API with longer timeout for large files
    const https = require('https');
    const http = require('http');
    
    const url = new URL(`${apiUrl}/recordings/upload`);
    const client = url.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: headers
    };

    console.log('Sending API request...', {
      url: `${apiUrl}/recordings/upload`,
      method: 'POST',
      headers: headers,
      bufferSize: buffer.length,
      hasAuthToken: !!tokenToUse
    });

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('API response received:', res.statusCode, res.statusMessage);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data);
              console.log('Upload successful:', responseData);
              resolve({ success: true, data: responseData });
            } catch (parseError) {
              resolve({ success: true, data: { message: 'Upload successful' } });
            }
          } else {
            let errorText = '';
            try {
              errorText = data;
            } catch (textError) {
              errorText = 'Unable to read error response';
            }
            
            let errorMessage = `Upload failed: ${res.statusCode}`;
            if (res.statusCode === 401) {
              errorMessage = 'Authentication failed: Invalid or expired token. Please login again.';
            } else if (res.statusCode === 413) {
              errorMessage = 'File too large for single upload. Please try again or contact support for large file uploads.';
            } else if (res.statusCode === 500) {
              errorMessage = 'Server error: Please try again later.';
            } else {
              errorMessage = `Upload failed: ${res.statusCode} ${res.statusMessage} - ${errorText}`;
            }
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Upload error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Upload timeout'));
      });

      req.setTimeout(120000); // 2 minute timeout
      
      // Write form data
      formData.pipe(req);
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific error types
    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = 'Upload timeout: Request took too long. Large files may take longer to upload.';
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errorMessage = 'Network error: Unable to connect to server. Please check your internet connection.';
    } else if (error.message.includes('Base64 decoding failed')) {
      errorMessage = 'Recording data corrupted. Please try recording again.';
    }
    
    return { success: false, error: errorMessage };
  }
});

// IPC Handler for starting multipart upload
ipcMain.handle('start-multipart-upload', async (event, { filename, fileSize, contentType, authToken }) => {
  try {
    const tokenToUse = authToken || store.get('authToken');
    
    if (!tokenToUse || tokenToUse === 'null' || tokenToUse === 'undefined') {
      throw new Error('No authentication token available. Please login first.');
    }

    const https = require('https');
    const http = require('http');
    
    const url = new URL(`${config.API_BASE_URL}/recordings/start-multipart-upload`);
    const client = url.protocol === 'https:' ? https : http;

    const requestData = JSON.stringify({
      fileName: filename,
      fileSize: fileSize,
      contentType: contentType
    });

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data);
              console.log('Multipart upload started:', responseData);
              resolve({ success: true, data: responseData });
            } catch (parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            let errorMessage = `Failed to start multipart upload: ${res.statusCode}`;
            if (res.statusCode === 401) {
              errorMessage = 'Authentication failed: Invalid or expired token.';
            }
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Start multipart upload error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(30000); // 30 second timeout
      req.write(requestData);
      req.end();
    });

  } catch (error) {
    console.error('Start multipart upload error:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler for generating presigned URLs
ipcMain.handle('generate-presigned-urls', async (event, { filename, uploadId, fileSize, authToken }) => {
  try {
    const tokenToUse = authToken || store.get('authToken');
    
    if (!tokenToUse || tokenToUse === 'null' || tokenToUse === 'undefined') {
      throw new Error('No authentication token available. Please login first.');
    }

    const https = require('https');
    const http = require('http');
    
    const url = new URL(`${config.API_BASE_URL}/recordings/generate-presigned-url`);
    const client = url.protocol === 'https:' ? https : http;

    const requestData = JSON.stringify({
      fileName: filename,
      uploadId: uploadId,
      fileSize: fileSize
    });

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data);
              console.log('Presigned URLs generated:', responseData.presignedUrls?.length || 0);
              resolve({ success: true, data: responseData });
            } catch (parseError) {
              reject(new Error('Invalid response format'));
            }
          } else {
            let errorMessage = `Failed to generate presigned URLs: ${res.statusCode}`;
            if (res.statusCode === 401) {
              errorMessage = 'Authentication failed: Invalid or expired token.';
            }
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Generate presigned URLs error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(30000); // 30 second timeout
      req.write(requestData);
      req.end();
    });

  } catch (error) {
    console.error('Generate presigned URLs error:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler for uploading a single part
ipcMain.handle('upload-part', async (event, { presignedUrl, chunkData, contentType }) => {
  try {
    const buffer = Buffer.from(chunkData, 'base64');
    
    const https = require('https');
    const http = require('http');
    
    const url = new URL(presignedUrl);
    const client = url.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length
      }
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const etag = res.headers.etag;
            if (!etag) {
              reject(new Error('Missing ETag in response'));
              return;
            }
            resolve({ success: true, etag: etag.replace(/"/g, '') });
          } else {
            reject(new Error(`Part upload failed: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Part upload error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Part upload timeout'));
      });

      req.setTimeout(300000); // 5 minute timeout for large parts
      req.write(buffer);
      req.end();
    });

  } catch (error) {
    console.error('Part upload error:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handler for completing multipart upload
ipcMain.handle('complete-multipart-upload', async (event, { filename, uploadId, parts, authToken }) => {
  try {
    const tokenToUse = authToken || store.get('authToken');
    
    if (!tokenToUse || tokenToUse === 'null' || tokenToUse === 'undefined') {
      throw new Error('No authentication token available. Please login first.');
    }

    const https = require('https');
    const http = require('http');
    
    const url = new URL(`${config.API_BASE_URL}/recordings/complete-multipart-upload`);
    const client = url.protocol === 'https:' ? https : http;

    const requestData = JSON.stringify({
      fileName: filename,
      uploadId: uploadId,
      parts: parts
    });

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = client.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const responseData = JSON.parse(data);
              console.log('Multipart upload completed:', responseData);
              resolve({ success: true, data: responseData });
            } catch (parseError) {
              resolve({ success: true, data: { message: 'Upload completed successfully' } });
            }
          } else {
            let errorMessage = `Failed to complete multipart upload: ${res.statusCode}`;
            if (res.statusCode === 401) {
              errorMessage = 'Authentication failed: Invalid or expired token.';
            }
            reject(new Error(errorMessage));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Complete multipart upload error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(60000); // 1 minute timeout
      req.write(requestData);
      req.end();
    });

  } catch (error) {
    console.error('Complete multipart upload error:', error);
    return { success: false, error: error.message };
  }
});

// IPC Handlers for custom window controls
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// IPC Handler for getting screen sources
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 150, height: 150 }
    });
    return { success: true, sources };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handlers for recording overlay
ipcMain.handle('show-recording-overlay', async () => {
  try {
    if (!recordingOverlayWindow) {
      createRecordingOverlayWindow();
    } else {
      recordingOverlayWindow.show();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('hide-recording-overlay', async () => {
  try {
    if (recordingOverlayWindow) {
      recordingOverlayWindow.hide();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-overlay-timer', async (event, seconds) => {
  try {
    if (recordingOverlayWindow) {
      recordingOverlayWindow.webContents.send('timer-update', seconds);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handler for stopping recording from overlay
ipcMain.handle('stop-recording-from-overlay', async () => {
  try {
    if (!isRecording) {
      return { success: false, error: 'Not recording' };
    }

    isRecording = false;
    
    // Clear timer
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }

    // Notify main window to handle recording completion
    if (mainWindow) {
      mainWindow.webContents.send('stop-recording-from-overlay');
    }

    // Hide overlay
    if (recordingOverlayWindow) {
      recordingOverlayWindow.hide();
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handler for saving recording locally
ipcMain.handle('save-recording-local', async (event, { blobData, filename }) => {
  try {
    const buffer = Buffer.from(blobData, 'base64');
    const downloadsPath = app.getPath('downloads');
    const filePath = path.join(downloadsPath, filename);
    
    fs.writeFileSync(filePath, buffer);
    
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle recording warning response
ipcMain.handle('force-stop-recording', async () => {
  if (isRecording) {
    await ipcMain.handle('stop-recording');
  }
  app.quit();
});

// Handle app quit
app.on('before-quit', (event) => {
  if (isRecording) {
    event.preventDefault();
    mainWindow.webContents.send('show-recording-warning');
  }
}); 