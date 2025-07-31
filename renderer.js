// Renderer process script for Electron app
class RecordingApp {
  constructor() {
    this.isAuthenticated = false;
    this.isRecording = false;
    this.recordingSeconds = 0;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.screenStream = null;
    this.micStream = null;
    
    this.initializeElements();
    this.initializeEventListeners();
    this.initializeElectronListeners();
    this.checkAuthStatus();
    this.loadAudioPreferences();
    this.testScreenRecordingAPIs();
  }

  initializeElements() {
    // DOM elements
    this.authSection = document.getElementById('auth-section');
    this.recordingControls = document.getElementById('recording-controls');
    this.authTabs = document.querySelectorAll('.auth-tab');
    this.authContents = document.querySelectorAll('.auth-content');
    
    // Form elements
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.tokenInput = document.getElementById('auth-token');
    
    // Buttons
    this.loginBtn = document.getElementById('login-btn');
    this.saveTokenBtn = document.getElementById('save-token');
    this.startRecordingBtn = document.getElementById('start-recording');
    this.stopRecordingBtn = document.getElementById('stop-recording');
    this.logoutBtn = document.getElementById('logout');
    
    // Status elements
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.timer = document.getElementById('timer');
    
    // Modal elements
    this.recordingWarningModal = document.getElementById('recording-warning-modal');
    this.cancelCloseBtn = document.getElementById('cancel-close');
    this.forceCloseBtn = document.getElementById('force-close');
    
    // Audio control elements
    this.systemAudioToggle = document.getElementById('system-audio-toggle');
    this.micAudioToggle = document.getElementById('mic-audio-toggle');
  }

  initializeEventListeners() {
    // Tab switching
    this.authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Event listeners
    this.loginBtn.addEventListener('click', () => this.handleLogin());
    this.saveTokenBtn.addEventListener('click', () => this.handleSaveToken());
    this.startRecordingBtn.addEventListener('click', () => this.handleStartRecording());
    this.stopRecordingBtn.addEventListener('click', () => this.handleStopRecording());
    this.logoutBtn.addEventListener('click', () => this.handleLogout());

    // Enter key handlers
    this.emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    this.passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    this.tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSaveToken();
    });

    // Modal event listeners
    this.cancelCloseBtn.addEventListener('click', () => {
      this.recordingWarningModal.classList.add('hidden');
    });
    this.forceCloseBtn.addEventListener('click', () => {
      window.electronAPI.forceStopRecording();
    });

    // Audio control event listeners
    this.systemAudioToggle.addEventListener('change', () => {
      this.saveAudioPreferences();
    });
    this.micAudioToggle.addEventListener('change', () => {
      this.saveAudioPreferences();
    });
    
    // Window control event listeners
    const minimizeBtn = document.getElementById('minimize-btn');
    const closeBtn = document.getElementById('close-btn');
    
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        window.electronAPI.minimizeWindow();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.electronAPI.closeWindow();
      });
    }
  }

  initializeElectronListeners() {
    // Timer updates from main process
    window.electronAPI.onRecordingTimerUpdate((seconds) => {
      this.recordingSeconds = seconds;
      this.updateTimer();
    });

    // Recording stopped notification
    window.electronAPI.onRecordingStopped(() => {
      this.handleRecordingStopped();
    });

    // Screen sources available
    window.electronAPI.onScreenSourcesAvailable((sources) => {
      this.handleScreenSourcesAvailable(sources);
    });

    // Recording warning
    window.electronAPI.onShowRecordingWarning(() => {
      this.recordingWarningModal.classList.remove('hidden');
    });
    
    // Stop recording from overlay
    window.electronAPI.onStopRecordingFromOverlay(() => {
      this.handleStopRecordingFromOverlay();
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    this.authTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    this.authContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-content`);
    });
  }

  async checkAuthStatus() {
    try {
      const result = await window.electronAPI.getAuthToken();
      if (result.success && result.token) {
        this.setAuthenticated(true);
        console.log('✅ Token loaded from storage:', result.token.substring(0, 20) + '...');
      } else {
        console.log('ℹ️ No token found in storage');
        this.setAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Failed to load token from storage:', error);
      this.setAuthenticated(false);
    }
  }

  setAuthenticated(authenticated) {
    this.isAuthenticated = authenticated;
    document.body.classList.toggle('authenticated', authenticated);
    
    if (authenticated) {
      this.showMessage('login', 'Welcome to ClassCapsule Recorder!', 'success');
    }
  }

  showMessage(type, message, className = 'error') {
    const messageEl = document.getElementById(`${type}-message`);
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `message ${className}`;
      messageEl.classList.remove('hidden');
      
      setTimeout(() => {
        messageEl.classList.add('hidden');
      }, 3000);
    }
  }

  setButtonLoading(button, loading) {
    if (loading) {
      button.classList.add('btn-loading');
      button.disabled = true;
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
    }
  }

  async handleLogin() {
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value.trim();

    if (!email || !password) {
      this.showMessage('login', 'Please enter both email and password');
      return;
    }

    this.setButtonLoading(this.loginBtn, true);

    try {
      console.log('Attempting login for:', email);
      
      const response = await fetch('https://class-capsule-2.onrender.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Login failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.access_token) {
        // Save token using Electron API
        const saveResult = await window.electronAPI.setAuthToken(data.access_token);
        if (saveResult.success) {
          console.log('✅ Login successful, token saved');
          this.showMessage('login', 'Login successful! Welcome to ClassCapsule.', 'success');
          this.setAuthenticated(true);
          
          // Clear form
          this.emailInput.value = '';
          this.passwordInput.value = '';
        } else {
          throw new Error('Failed to save token');
        }
      } else {
        throw new Error('No access_token received from server');
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      this.showMessage('login', error.message || 'Login failed. Please try again.');
    } finally {
      this.setButtonLoading(this.loginBtn, false);
      window.location.reload();
    }
  }

  async handleSaveToken() {
    const token = this.tokenInput.value.trim();

    if (!token) {
      this.showMessage('token', 'Please enter a valid token');
      return;
    }

    this.setButtonLoading(this.saveTokenBtn, true);

    try {
      console.log('Attempting to save token:', token.substring(0, 20) + '...');
      
      const result = await window.electronAPI.setAuthToken(token);
      if (result.success) {
        this.showMessage('token', 'Token saved successfully!', 'success');
        this.setAuthenticated(true);
      } else {
        throw new Error(result.error || 'Failed to save token');
      }
      
    } catch (error) {
      console.error('❌ Failed to save token:', error);
      this.showMessage('token', `Error saving token: ${error.message}`);
    } finally {
      this.setButtonLoading(this.saveTokenBtn, false);
    }
  }

  async handleStartRecording() {
    try {
      this.setButtonLoading(this.startRecordingBtn, true);
      this.statusText.textContent = "Starting recording...";
      
      // Get screen sources first
      const sourcesResult = await window.electronAPI.getScreenSources();
      if (!sourcesResult.success) {
        throw new Error(sourcesResult.error || 'Failed to get screen sources');
      }

      // Start the actual screen recording
      await this.startScreenRecording(sourcesResult.sources);

      // Start recording process in main process
      const startResult = await window.electronAPI.startRecording();
      if (!startResult.success) {
        throw new Error(startResult.error || 'Failed to start recording');
      }

      // Update UI
      this.isRecording = true;
      this.startRecordingBtn.classList.add('hidden');
      this.stopRecordingBtn.classList.remove('hidden');
      this.statusIndicator.classList.add('recording');
      this.statusDot.classList.add('recording');
      this.statusText.textContent = 'Recording in progress...';
      this.timer.classList.remove('hidden');
      
      // Show recording overlay
      this.showRecordingOverlay();
      
      this.showRecordingNotification('Recording started!', 'success');
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.statusText.textContent = `Error: ${error.message}`;
      this.showRecordingNotification('Failed to start recording', 'error');
    } finally {
      this.setButtonLoading(this.startRecordingBtn, false);
    }
  }



  async startScreenRecording(sources) {
    try {
      console.log('Starting screen recording with sources:', sources);

      // For now, select the first available source (full screen)
      const source = sources[0];
      if (!source) {
        throw new Error('No screen sources available');
      }

      console.log('Selected source:', source.name);

      // Try using getDisplayMedia first (modern approach)
      try {
        this.screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1280, max: 1920 },  // Increased from 640 for HD quality
            height: { ideal: 720, max: 1080 },  // Increased from 360 for HD quality
            frameRate: { ideal: 24, max: 30 }   // Increased from 8-10 for smooth video
          },
          audio: this.systemAudioToggle.checked // Only request audio if system audio is enabled
        });
        console.log('Using getDisplayMedia successfully');
      } catch (displayMediaError) {
        console.log('getDisplayMedia failed, trying getUserMedia with source ID');
        
        // Fallback to getUserMedia with source ID
        this.screenStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          }
        });
      }

      // Get microphone audio based on user preference
      this.micStream = null;
      if (this.micAudioToggle.checked) {
        try {
          console.log('Requesting microphone access...');
          
          // First check if microphone permissions are available
          const permissions = await navigator.permissions.query({ name: 'microphone' });
          console.log('Microphone permission state:', permissions.state);
          
          if (permissions.state === 'denied') {
            throw new Error('Microphone permission denied by user');
          }
          
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000, // Increased from 16000 for better audio quality
              channelCount: 2    // Stereo audio for better quality
            },
            video: false
          });
          console.log('Microphone access granted successfully');
        } catch (micError) {
          console.error('Microphone access failed:', micError);
          
          // Show specific error message for macOS
          if (micError.name === 'NotAllowedError') {
            throw new Error('Microphone access denied. Please grant microphone permission in System Preferences > Security & Privacy > Privacy > Microphone and restart the app.');
          } else if (micError.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.');
          } else {
            throw new Error(`Microphone access failed: ${micError.message}`);
          }
        }
      } else {
        console.log('Microphone recording disabled by user');
      }

      // Create audio context for mixing
      const audioContext = new AudioContext();
      const mixedAudio = audioContext.createMediaStreamDestination();
      
      // Add screen audio if available and enabled
      if (this.systemAudioToggle.checked && this.screenStream.getAudioTracks().length > 0) {
        const screenSource = audioContext.createMediaStreamSource(this.screenStream);
        screenSource.connect(mixedAudio);
        console.log('System audio added to mix');
      } else {
        console.log('System audio disabled by user or not available');
      }
      
      // Add microphone audio if available and enabled
      if (this.micAudioToggle.checked && this.micStream && this.micStream.getAudioTracks().length > 0) {
        const micSource = audioContext.createMediaStreamSource(this.micStream);
        micSource.connect(mixedAudio);
        console.log('Microphone audio added to mix');
      } else {
        console.log('Microphone audio disabled by user or not available');
      }

      // Create final media stream with video and mixed audio
      const audioTracks = mixedAudio.stream.getAudioTracks();
      const videoTracks = this.screenStream.getVideoTracks();
      
      // Only include audio tracks if we have any
      const finalStream = new MediaStream([
        ...videoTracks,
        ...audioTracks
      ]);
      
      console.log('Final stream created with:', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        systemAudioEnabled: this.systemAudioToggle.checked,
        micAudioEnabled: this.micAudioToggle.checked
      });

      // Create MediaRecorder with high-quality settings for better video/audio quality
      this.mediaRecorder = new MediaRecorder(finalStream, { 
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 1000000,  // 1 Mbps for high quality video (increased from 250k)
        audioBitsPerSecond: 64000     // 64 kbps for better audio quality (increased from 16k)
      });

      this.recordedChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingComplete();
      };

      // Start recording
      this.mediaRecorder.start(250); // Collect chunks every 250ms for better real-time recording
      console.log('MediaRecorder started successfully');

    } catch (error) {
      console.error('Failed to start screen recording:', error);
      throw new Error(`Screen recording failed: ${error.message}`);
    }
  }

  async handleRecordingComplete() {
    try {
      if (this.recordedChunks.length === 0) {
        console.warn('No recording data available');
        return;
      }

      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const filename = `lecture-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;

      console.log('Recording completed, preparing to upload...', {
        blobSize: blob.size,
        filename: filename,
        sizeMB: (blob.size / 1024 / 1024).toFixed(2)
      });

      // Get auth token
      const authResult = await window.electronAPI.getAuthToken();
      const authToken = authResult.success ? authResult.token : null;

      if (!authToken) {
        throw new Error('No authentication token available. Please login first.');
      }

      // Check file size and decide upload method
      const fileSizeMB = blob.size / 1024 / 1024;
      
      if (fileSizeMB < 10) {
        // Small file - use regular upload
        console.log('Using regular upload for small file');
        await this.uploadSmallFile(blob, filename, authToken);
      } else {
        // Large file - use multipart upload
        console.log('Using multipart upload for large file');
        await this.uploadLargeFile(blob, filename, authToken);
      }

      // Reset status text after successful upload
      setTimeout(() => {
        this.statusText.textContent = 'Ready to record';
      }, 2000);

    } catch (error) {
      console.error('Failed to handle recording completion:', error);
      this.showRecordingNotification(`Upload failed: ${error.message}`, 'error');
      
      // Fallback: save locally
      await this.saveRecordingLocally();
      
      // Reset status text after error
      setTimeout(() => {
        this.statusText.textContent = 'Ready to record';
      }, 2000);
    } finally {
      this.cleanup();
    }
  }

  async uploadSmallFile(blob, filename, authToken) {
    this.statusText.textContent = 'Preparing upload...';
    
    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let base64 = '';
    for (let i = 0; i < uint8Array.length; i++) {
      base64 += String.fromCharCode(uint8Array[i]);
    }
    base64 = btoa(base64);

    this.statusText.textContent = 'Uploading - 0%';

    // Upload using the existing upload function
    const uploadResult = await window.electronAPI.uploadRecording({
      blobData: base64,
      filename: filename,
      apiUrl: 'https://class-capsule-2.onrender.com',
      authToken: authToken
    });

    // Show completion progress
    this.statusText.textContent = 'Uploading - 100%';

    if (uploadResult.success) {
      console.log('Upload successful:', uploadResult.data);
      this.showRecordingNotification('Recording uploaded successfully!', 'success');
    } else {
      throw new Error(uploadResult.error || 'Upload failed');
    }
  }

  async uploadLargeFile(blob, filename, authToken) {
    try {
      this.statusText.textContent = 'Starting multipart upload...';
      
      // Start multipart upload
      const startResult = await window.electronAPI.startMultipartUpload({
        filename: filename,
        fileSize: blob.size,
        contentType: 'video/webm',
        authToken: authToken
      });

      if (!startResult.success) {
        throw new Error(startResult.error || 'Failed to start multipart upload');
      }

      const { uploadId } = startResult.data;
      console.log('UploadId:', uploadId);

      this.statusText.textContent = 'Generating upload URLs...';

      // Generate presigned URLs
      const presignedResult = await window.electronAPI.generatePresignedUrls({
        filename: filename,
        uploadId: uploadId,
        fileSize: blob.size,
        authToken: authToken
      });

      if (!presignedResult.success) {
        throw new Error(presignedResult.error || 'Failed to generate presigned URLs');
      }

      const presignedUrls = presignedResult.data.presignedUrls;
      console.log('Presigned URLs count:', presignedUrls.length);

      // Upload parts with retry logic
      const parts = [];
      const chunkSize = Math.ceil(blob.size / presignedUrls.length);
      console.log(`File size: ${blob.size}, Chunk size: ${chunkSize}, Parts: ${presignedUrls.length}`);

      for (let i = 0; i < presignedUrls.length; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, blob.size);
        const chunk = blob.slice(start, end);
        const presignedUrl = presignedUrls[i];

        // Update progress with simple format
        const progress = Math.round(((i + 1) / presignedUrls.length) * 100);
        this.statusText.textContent = `Uploading - ${progress}%`;

        // Convert chunk to base64
        const arrayBuffer = await chunk.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        let chunkBase64 = '';
        for (let j = 0; j < uint8Array.length; j++) {
          chunkBase64 += String.fromCharCode(uint8Array[j]);
        }
        chunkBase64 = btoa(chunkBase64);

        // Upload part with retry logic
        const partResult = await this.uploadPartWithRetry(presignedUrl, chunkBase64, 'video/webm', i + 1);
        
        parts.push({
          etag: partResult.etag,
          PartNumber: i + 1
        });

        console.log(`Part ${i + 1} uploaded successfully`);
      }

      this.statusText.textContent = 'Completing upload...';

      // Sort parts by PartNumber to ensure correct order
      parts.sort((a, b) => a.PartNumber - b.PartNumber);

      // Complete multipart upload
      const completeResult = await window.electronAPI.completeMultipartUpload({
        filename: filename,
        uploadId: uploadId,
        parts: parts,
        authToken: authToken
      });

      if (completeResult.success) {
        console.log('Multipart upload completed:', completeResult.data);
        this.showRecordingNotification('Recording uploaded successfully!', 'success');
      } else {
        throw new Error(completeResult.error || 'Failed to complete multipart upload');
      }

    } catch (error) {
      console.error('Multipart upload failed:', error);
      throw error;
    }
  }

  async uploadPartWithRetry(presignedUrl, chunkData, contentType, partNumber, retryCount = 0) {
    try {
      const result = await window.electronAPI.uploadPart({
        presignedUrl: presignedUrl,
        chunkData: chunkData,
        contentType: contentType
      });

      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Part upload failed');
      }
    } catch (error) {
      console.error(`Error uploading part ${partNumber}:`, error);
      
      if (retryCount < 3) {
        console.log(`Retrying part ${partNumber} (attempt ${retryCount + 1}/3)`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.uploadPartWithRetry(presignedUrl, chunkData, contentType, partNumber, retryCount + 1);
      } else {
        throw new Error(`Failed to upload part ${partNumber} after 3 attempts`);
      }
    }
  }

  async saveRecordingLocally() {
    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const filename = `lecture-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let base64 = '';
      for (let i = 0; i < uint8Array.length; i++) {
        base64 += String.fromCharCode(uint8Array[i]);
      }
      base64 = btoa(base64);

      const saveResult = await window.electronAPI.saveRecordingLocal({
        blobData: base64,
        filename: filename
      });

      if (saveResult.success) {
        this.showRecordingNotification(`Recording saved locally: ${saveResult.filePath}`, 'success');
      } else {
        this.showRecordingNotification('Failed to save recording locally', 'error');
      }
    } catch (saveError) {
      console.error('Failed to save recording locally:', saveError);
      this.showRecordingNotification('Failed to save recording', 'error');
    }
  }

  cleanup() {
    this.recordedChunks = [];
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
  }

  async handleStopRecording() {
    try {
      this.setButtonLoading(this.stopRecordingBtn, true);
      this.statusText.textContent = "Stopping recording...";
      
      // Stop the MediaRecorder if it's running
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        console.log('MediaRecorder stopped');
      }
      
      const result = await window.electronAPI.stopRecording();
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop recording');
      }
      
      this.statusText.textContent = 'Processing recording...';
      
      setTimeout(() => {
        this.statusText.textContent = 'Ready to record';
        this.timer.classList.add('hidden');
        this.timer.textContent = '00:00';
        this.recordingSeconds = 0;
      }, 2000);

      this.showRecordingNotification(`Recording stopped after ${this.formatTime(this.recordingSeconds)}`, 'success');
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.statusText.textContent = `Error: ${error.message}`;
    } finally {
      this.setButtonLoading(this.stopRecordingBtn, false);
    }
  }

  handleRecordingStopped() {
    this.isRecording = false;
    this.stopRecordingBtn.classList.add('hidden');
    this.startRecordingBtn.classList.remove('hidden');
    this.statusIndicator.classList.remove('recording');
    this.statusDot.classList.remove('recording');
    this.setButtonLoading(this.startRecordingBtn, false);
    this.setButtonLoading(this.stopRecordingBtn, false);
    
    // Hide recording overlay
    this.hideRecordingOverlay();
  }

  async handleStopRecordingFromOverlay() {
    try {
      console.log('Stopping recording from overlay...');
      
      // Stop the MediaRecorder if it's running
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        console.log('MediaRecorder stopped from overlay');
      }
      
      // Update UI state
      this.isRecording = false;
      this.stopRecordingBtn.classList.add('hidden');
      this.startRecordingBtn.classList.remove('hidden');
      this.statusIndicator.classList.remove('recording');
      this.statusDot.classList.remove('recording');
      this.setButtonLoading(this.startRecordingBtn, false);
      this.setButtonLoading(this.stopRecordingBtn, false);
      
      this.statusText.textContent = 'Processing recording...';
      
      setTimeout(() => {
        this.statusText.textContent = 'Ready to record';
        this.timer.classList.add('hidden');
        this.recordingSeconds = 0;
        this.timer.textContent = '00:00';
      }, 2000);

      this.showRecordingNotification(`Recording stopped after ${this.formatTime(this.recordingSeconds)}`, 'success');
      
    } catch (error) {
      console.error('Failed to stop recording from overlay:', error);
      this.statusText.textContent = `Error: ${error.message}`;
    }
  }

  async handleLogout() {
    try {
      this.setButtonLoading(this.logoutBtn, true);
      this.statusText.textContent = "Logging out...";
      
      // Clear token using Electron API
      const result = await window.electronAPI.setAuthToken(null);
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear token');
      }
      
      // Clear form fields
      this.emailInput.value = '';
      this.passwordInput.value = '';
      this.tokenInput.value = '';
      
      // Reset recording state
      if (this.isRecording) {
        await this.handleStopRecording();
      }
      
      this.setAuthenticated(false);
      console.log('✅ Logout successful');
      this.showMessage('login', 'Logged out successfully', 'success');
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      this.showMessage('login', `Logout failed: ${error.message}`);
    } finally {
      this.setButtonLoading(this.logoutBtn, false);
    }
  }

  handleScreenSourcesAvailable(sources) {
    console.log('Screen sources available:', sources);
    // Here you could show a source selection dialog if needed
  }

  testScreenRecordingAPIs() {
    console.log('Testing screen recording APIs...');
    console.log('navigator.mediaDevices:', navigator.mediaDevices);
    console.log('getDisplayMedia available:', !!navigator.mediaDevices.getDisplayMedia);
    console.log('getUserMedia available:', !!navigator.mediaDevices.getUserMedia);
  }

  updateTimer() {
    const formattedTime = this.formatTime(this.recordingSeconds);
    this.timer.textContent = formattedTime;
    // this.overlayTimer.textContent = formattedTime; // Removed as per edit hint
    
    // Update overlay timer
    window.electronAPI.updateOverlayTimer(this.recordingSeconds);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  showRecordingNotification(message, type) {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '1000';
    notification.style.minWidth = '200px';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  saveAudioPreferences() {
    const preferences = {
      systemAudio: this.systemAudioToggle.checked,
      micAudio: this.micAudioToggle.checked
    };
    
    try {
      localStorage.setItem('audioPreferences', JSON.stringify(preferences));
      console.log('Audio preferences saved:', preferences);
    } catch (error) {
      console.error('Failed to save audio preferences:', error);
    }
  }

  loadAudioPreferences() {
    try {
      const saved = localStorage.getItem('audioPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        this.systemAudioToggle.checked = preferences.systemAudio !== false; // Default to true
        this.micAudioToggle.checked = preferences.micAudio !== false; // Default to true
        console.log('Audio preferences loaded:', preferences);
      } else {
        // Default to both enabled
        this.systemAudioToggle.checked = true;
        this.micAudioToggle.checked = true;
        console.log('Using default audio preferences (both enabled)');
      }
    } catch (error) {
      console.error('Failed to load audio preferences:', error);
      // Fallback to defaults
      this.systemAudioToggle.checked = true;
      this.micAudioToggle.checked = true;
    }
  }

  showRecordingOverlay() {
    window.electronAPI.showRecordingOverlay();
    console.log('Recording overlay shown');
  }

  hideRecordingOverlay() {
    window.electronAPI.hideRecordingOverlay();
    console.log('Recording overlay hidden');
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new RecordingApp();
}); 