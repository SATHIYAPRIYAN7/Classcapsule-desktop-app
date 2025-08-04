// Background service worker
let authToken = null;

// Initialize auth token from storage
chrome.storage.local.get(['authToken'], (result) => {
  if (chrome.runtime.lastError) {
    console.error('Failed to load auth token from storage:', chrome.runtime.lastError);
  } else {
    authToken = result.authToken;
    console.log('Auth token loaded from storage:', authToken ? 'Present' : 'Not found');
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'set-auth-token':
      handleSetAuthToken(request.token, sendResponse);
      return true; // Keep channel open for sendResponse
      
    case 'upload-recording':
      handleUploadRecording(request, sendResponse);
      return true; // Keep channel open for async response
      
    case 'recording-stopped':
      // Just acknowledge receipt, don't forward
      console.log('Recording stopped notification received');
      sendResponse({ success: true });
      return true;
      
    case 'test-response':
      // Just acknowledge receipt, don't forward
      console.log('Test response received');
      sendResponse({ success: true });
      return true;
      
    case 'test-token-access':
      // Test if we can access the stored token
      handleTestTokenAccess(sendResponse);
      return true;
      
    case 'get-auth-token':
      // Get the stored auth token
      handleGetAuthToken(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

async function handleSetAuthToken(token, sendResponse) {
  if (token === null) {
    // Handle logout - clear the token
    authToken = null;
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.remove(['authToken'], () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      console.log('Auth token cleared from storage successfully');
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to clear auth token:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else {
    // Handle login - save the token
    authToken = token;
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ authToken: token }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      console.log('Auth token saved to storage successfully');
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to save auth token:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
}

async function handleGetAuthToken(sendResponse) {
  try {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
    
    if (result.authToken) {
      sendResponse({ 
        success: true, 
        token: result.authToken
      });
    } else {
      sendResponse({ 
        success: false, 
        error: 'No auth token found'
      });
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleTestTokenAccess(sendResponse) {
  try {
    const result = await new Promise((resolve, reject) => {
      chrome.storage.local.get(['authToken'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
    
    sendResponse({ 
      success: true, 
      hasToken: !!result.authToken,
      tokenPreview: result.authToken ? result.authToken.substring(0, 20) + '...' : 'None'
    });
  } catch (error) {
    console.error('Failed to test token access:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleUploadRecording(request, sendResponse) {
  console.log('Starting upload process...', { 
    hasBlobData: !!request.blobData, 
    filename: request.filename,
    apiUrl: request.apiUrl 
  });
  
  try {
    // Validate inputs
    if (!request.blobData) {
      throw new Error('Invalid recording data: Expected blobData');
    }

    // Validate and convert base64 back to blob
    console.log('Received blobData length:', request.blobData ? request.blobData.length : 'undefined');
    
    if (!request.blobData || typeof request.blobData !== 'string') {
      throw new Error('Invalid blobData: Expected non-empty string');
    }
    
    // Validate base64 format (more lenient for simple conversion)
    if (!request.blobData || typeof request.blobData !== 'string') {
      throw new Error('Invalid blobData: Expected non-empty string');
    }
    
    let blob;
    try {
      const binaryString = atob(request.blobData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'video/webm' });
      
      console.log('Successfully converted base64 to blob. Size:', blob.size, 'bytes');
    } catch (base64Error) {
      console.error('Base64 decoding failed:', base64Error);
      throw new Error(`Base64 decoding failed: ${base64Error.message}`);
    }

    // Create FormData and append blob with filename
    const formData = new FormData();
    formData.append('file', blob, request.filename || `recording-${Date.now()}.webm`);
    
    // Add recording type metadata if provided
    if (request.recordingMode) {
      formData.append('recordingType', request.recordingMode);
      console.log('Recording mode:', request.recordingMode);
    }

    // Prepare headers
    const headers = {};
    const tokenToUse = request.authToken || authToken;
    
    if (tokenToUse && tokenToUse !== 'null' && tokenToUse !== 'undefined') {
      headers['Authorization'] = `Bearer ${tokenToUse}`;
      console.log('Using auth token:', tokenToUse.substring(0, 20) + '...');
    } else {
      console.log('No valid auth token available');
      throw new Error('No authentication token available. Please login first.');
    }

    // Send to API with longer timeout for large files
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for large files
    
    console.log('Sending API request...', {
      url: `${request.apiUrl}/recordings/upload`,
      method: 'POST',
      headers: headers,
      blobSize: blob.size,
      hasAuthToken: !!(request.authToken || authToken)
    });
    
    const response = await fetch(`${request.apiUrl}/recordings/upload`, {
      method: 'POST',
      headers: headers,
      body: formData,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('API response received:', response.status, response.statusText);

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (textError) {
        errorText = 'Unable to read error response';
      }
      
      if (response.status === 401) {
        throw new Error('Authentication failed: Invalid or expired token. Please login again.');
      } else if (response.status === 413) {
        throw new Error('File too large: Recording exceeds maximum allowed size.');
      } else if (response.status === 500) {
        throw new Error('Server error: Please try again later.');
      } else {
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    sendResponse({ success: true, data });
    
  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific error types
    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = 'Upload timeout: Request took too long. Please try again with a shorter recording.';
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errorMessage = 'Network error: Unable to connect to server. Please check your internet connection.';
    } else if (error.message.includes('Base64 decoding failed')) {
      errorMessage = 'Recording data corrupted. Please try recording again.';
    }
    
    sendResponse({ 
      success: false, 
      error: errorMessage
    });
  }
}