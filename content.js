// Content script injected into the page
class RecordingManager {
    constructor() {
      this.mediaRecorder = null;
      this.recordedChunks = [];
      this.isRecording = false;
      this.explicitlyStarted = false;
      this.screenStream = null;
      this.micStream = null;
      this.audioContext = null;
      this.createUI();
    }
  
    createUI() {
      this.uiContainer = document.createElement('div');
      this.uiContainer.id = 'recording-ui';
      Object.assign(this.uiContainer.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        padding: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        borderRadius: '5px',
        fontFamily: 'Arial, sans-serif'
      });
  
      this.statusText = document.createElement('div');
      this.statusText.id = 'recording-status';
      this.statusText.textContent = 'Ready to record';
  
      this.stopButton = document.createElement('button');
      this.stopButton.textContent = '■ Stop Recording';
      Object.assign(this.stopButton.style, {
        marginTop: '8px',
        padding: '5px 10px',
        cursor: 'pointer'
      });
      this.stopButton.onclick = () => this.stopRecording();
  
      this.uiContainer.appendChild(this.statusText);
      this.uiContainer.appendChild(this.stopButton);
      document.body.appendChild(this.uiContainer);
  
      this.updateUI();
    }
  
    updateUI() {
      this.stopButton.style.display = this.isRecording ? 'block' : 'none';
      this.statusText.textContent = this.isRecording 
        ? '● Recording...' 
        : 'Ready to record';
    }

    // Platform detection
    isMac() {
      return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    }

    isWindows() {
      return navigator.platform.toUpperCase().indexOf('WIN') >= 0;
    }

    async startRecording(recordingMode = 'video-audio') {
      if (this.isRecording) {
        console.log('Already recording, ignoring start command');
        return;
      }
      
      console.log('Starting recording process...', { recordingMode });
      
      try {
        this.isRecording = true;
        this.explicitlyStarted = true;
        this.recordingMode = recordingMode;
        this.updateUI();

        // Mac-specific: Start with simpler approach
        if (this.isMac()) {
          console.log('Using Mac-optimized recording approach...');
          await this.startRecordingMac();
        } else {
          console.log('Using standard recording approach...');
          await this.startRecordingStandard();
        }
  
      } catch (error) {
        console.error('Recording failed:', error);
        this.cleanup();
        
        let errorMessage = this.getPlatformSpecificErrorMessage(error);
        this.showError(errorMessage);
      }
    }

    async startRecordingMac() {
      // Mac-specific: Simplified approach without complex audio mixing
      console.log('Requesting screen capture for Mac...');
      
      if (this.recordingMode === 'audio-only') {
        // Audio-only recording for Mac
        console.log('Starting audio-only recording on Mac...');
        await this.startAudioOnlyRecordingMac();
        return;
      }
      
      // Step 1: Get screen capture with audio (simplified for Mac)
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor"
        },
        audio: {
          echoCancellation: false, // Disable for Mac compatibility
          noiseSuppression: false,  // Disable for Mac compatibility
          sampleRate: 48000         // Use standard sample rate
        }
      });

      console.log('Screen capture obtained on Mac:', {
        videoTracks: this.screenStream.getVideoTracks().length,
        audioTracks: this.screenStream.getAudioTracks().length
      });

      // Step 2: Try to get microphone (optional, simplified)
      this.micStream = null;
      try {
        console.log('Requesting microphone access for Mac...');
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 48000
          },
          video: false
        });
        console.log('Microphone access granted on Mac');
      } catch (micError) {
        console.warn('Microphone access denied on Mac:', micError);
        // Continue without microphone - screen audio is sufficient
      }

      // Step 3: Create final stream (simplified for Mac)
      let finalStream;
      
      if (this.micStream && this.micStream.getAudioTracks().length > 0) {
        // For Mac: Use a simpler mixing approach
        console.log('Creating simplified audio mix for Mac...');
        finalStream = await this.createSimpleMixedStream();
      } else {
        // Use only screen audio
        console.log('Using screen audio only on Mac...');
        finalStream = this.screenStream;
      }

      // Step 4: Create media recorder with Mac-optimized settings
      const mimeType = this.getMacSupportedMimeType();
      console.log('Using Mac MIME type:', mimeType);

      this.mediaRecorder = new MediaRecorder(finalStream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 2000000, // Lower bitrate for Mac stability
        audioBitsPerSecond: 96000    // Lower audio bitrate for Mac
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
          console.log('Data chunk received on Mac:', e.data.size, 'bytes');
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error on Mac:', event);
        this.showError('Recording error occurred on Mac');
      };

      this.mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully on Mac');
      };

      this.mediaRecorder.start(2000); // Collect chunks every 2 seconds for Mac stability
      
      // Handle screen share stop
      this.screenStream.getVideoTracks()[0].onended = () => {
        console.log('Screen share ended by user on Mac');
        this.stopRecording();
      };
    }

    async startAudioOnlyRecordingMac() {
      // Audio-only recording for Mac
      console.log('Starting audio-only recording on Mac...');
      
      // Get microphone audio
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000
        },
        video: false
      });
      
      console.log('Microphone access granted for audio-only recording on Mac');
      
      // Create audio-only stream
      const audioStream = this.micStream;
      
      // Create media recorder for audio-only
      const mimeType = this.getAudioOnlyMimeType();
      console.log('Using audio-only MIME type:', mimeType);
      
      this.mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
          console.log('Audio chunk received on Mac:', e.data.size, 'bytes');
        }
      };
      
      this.mediaRecorder.onerror = (event) => {
        console.error('Audio MediaRecorder error on Mac:', event);
        this.showError('Audio recording error occurred on Mac');
      };
      
      this.mediaRecorder.onstart = () => {
        console.log('Audio MediaRecorder started successfully on Mac');
      };
      
      this.mediaRecorder.start(2000); // Collect chunks every 2 seconds
    }

    async startRecordingStandard() {
      // Standard approach for Windows and other platforms
      console.log('Requesting screen capture...');
      
      if (this.recordingMode === 'audio-only') {
        // Audio-only recording for standard platforms
        console.log('Starting audio-only recording...');
        await this.startAudioOnlyRecordingStandard();
        return;
      }
      
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      console.log('Screen capture obtained:', {
        videoTracks: this.screenStream.getVideoTracks().length,
        audioTracks: this.screenStream.getAudioTracks().length
      });

      // Step 2: Try to get microphone audio (optional)
      this.micStream = null;
      try {
        console.log('Requesting microphone access...');
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          },
          video: false
        });
        console.log('Microphone access granted');
      } catch (micError) {
        console.warn('Microphone access denied or not available:', micError);
        // Continue without microphone - screen audio is usually sufficient
      }

      // Step 3: Create mixed audio stream
      let finalStream;
      
      if (this.micStream && this.micStream.getAudioTracks().length > 0) {
        // Mix screen and microphone audio
        console.log('Mixing screen and microphone audio...');
        finalStream = await this.createMixedAudioStream();
      } else {
        // Use only screen audio
        console.log('Using screen audio only...');
        finalStream = this.screenStream;
      }

      // Step 4: Create media recorder with appropriate codec
      const mimeType = this.getSupportedMimeType();
      console.log('Using MIME type:', mimeType);

      this.mediaRecorder = new MediaRecorder(finalStream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000   // 128 kbps for audio
      });
  
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
          console.log('Data chunk received:', e.data.size, 'bytes');
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.showError('Recording error occurred');
      };

      this.mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully');
      };
  
      this.mediaRecorder.start(1000); // Collect chunks every 1 second
      
      // Handle screen share stop
      this.screenStream.getVideoTracks()[0].onended = () => {
        console.log('Screen share ended by user');
        this.stopRecording();
      };
    }

    async startAudioOnlyRecordingStandard() {
      // Audio-only recording for standard platforms
      console.log('Starting audio-only recording...');
      
      // Get microphone audio
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        video: false
      });
      
      console.log('Microphone access granted for audio-only recording');
      
      // Create audio-only stream
      const audioStream = this.micStream;
      
      // Create media recorder for audio-only
      const mimeType = this.getAudioOnlyMimeType();
      console.log('Using audio-only MIME type:', mimeType);
      
      this.mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
          console.log('Audio chunk received:', e.data.size, 'bytes');
        }
      };
      
      this.mediaRecorder.onerror = (event) => {
        console.error('Audio MediaRecorder error:', event);
        this.showError('Audio recording error occurred');
      };
      
      this.mediaRecorder.onstart = () => {
        console.log('Audio MediaRecorder started successfully');
      };
      
      this.mediaRecorder.start(1000); // Collect chunks every 1 second
    }

    getMacSupportedMimeType() {
      // Mac-optimized codec selection
      const types = [
        'video/webm;codecs=vp8,opus',  // More compatible with Mac
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm'
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      
      return 'video/webm'; // Fallback
    }

    async createSimpleMixedStream() {
      // Simplified audio mixing for Mac
      try {
        // For Mac: Just combine the tracks without complex audio context
        const tracks = [
          ...this.screenStream.getVideoTracks(),
          ...this.screenStream.getAudioTracks(),
          ...this.micStream.getAudioTracks()
        ];
        
        const finalStream = new MediaStream(tracks);
        console.log('Simple audio mixing completed for Mac');
        return finalStream;
      } catch (error) {
        console.error('Simple audio mixing failed on Mac:', error);
        // Fallback to screen stream only
        return this.screenStream;
      }
    }

    getSupportedMimeType() {
      const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      
      return 'video/webm'; // Fallback
    }

    getAudioOnlyMimeType() {
      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      
      return 'audio/webm'; // Fallback
    }

    async createMixedAudioStream() {
      try {
        this.audioContext = new AudioContext();
        const mixedAudio = this.audioContext.createMediaStreamDestination();
        
        // Add screen audio
        if (this.screenStream.getAudioTracks().length > 0) {
          const screenSource = this.audioContext.createMediaStreamSource(this.screenStream);
          screenSource.connect(mixedAudio);
          console.log('Screen audio added to mix');
        }
        
        // Add microphone audio
        if (this.micStream && this.micStream.getAudioTracks().length > 0) {
          const micSource = this.audioContext.createMediaStreamSource(this.micStream);
          micSource.connect(mixedAudio);
          console.log('Microphone audio added to mix');
        }

        // Create final stream with video and mixed audio
        const finalStream = new MediaStream([
          ...this.screenStream.getVideoTracks(),
          ...mixedAudio.stream.getAudioTracks()
        ]);

        return finalStream;
      } catch (error) {
        console.error('Audio mixing failed:', error);
        // Fallback to screen stream only
        return this.screenStream;
      }
    }

    getPlatformSpecificErrorMessage(error) {
      const errorMessage = error.message || error.toString();
      
      if (this.isMac()) {
        // Mac-specific error handling
        if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          if (this.recordingMode === 'audio-only') {
            return 'Microphone permission denied on Mac. Please:\n1. Go to System Preferences > Security & Privacy > Privacy > Microphone\n2. Add Chrome/Edge to the list\n3. Restart your browser';
          }
          return 'Screen recording permission denied on Mac. Please:\n1. Go to System Preferences > Security & Privacy > Privacy > Screen Recording\n2. Add Chrome/Edge to the list\n3. Restart your browser';
        }
        if (errorMessage.includes('NotSupportedError')) {
          if (this.recordingMode === 'audio-only') {
            return 'Audio recording not supported on Mac. Please use Chrome or Edge browser.';
          }
          return 'Screen recording not supported on Mac. Please use Chrome or Edge browser.';
        }
        if (errorMessage.includes('audio') || errorMessage.includes('AudioContext')) {
          return 'Audio recording failed on Mac. Please:\n1. Check microphone permissions in System Preferences > Security & Privacy > Privacy > Microphone\n2. Try recording without microphone first\n3. Restart browser after granting permissions';
        }
        if (errorMessage.includes('Failed to start recording') || errorMessage.includes('getDisplayMedia')) {
          if (this.recordingMode === 'audio-only') {
            return 'Failed to start audio recording on Mac. Please:\n1. Check microphone permissions\n2. Try refreshing the page\n3. Ensure microphone is not being used by another app';
          }
          return 'Failed to start recording on Mac. Please:\n1. Ensure Chrome/Edge has screen recording permission\n2. Try refreshing the page\n3. Check if any other app is using screen recording';
        }
        if (errorMessage.includes('MediaRecorder') || errorMessage.includes('codec')) {
          return 'Video codec issue on Mac. Please try:\n1. Using a different browser (Chrome/Edge)\n2. Updating your browser to latest version\n3. Recording without microphone';
        }
      } else if (this.isWindows()) {
        if (errorMessage.includes('audio') || errorMessage.includes('could not start audio source')) {
          return 'Audio recording failed. Please ensure your audio drivers are working and try again.';
        }
        if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
          if (this.recordingMode === 'audio-only') {
            return 'Microphone permission denied. Please allow microphone access when prompted.';
          }
          return 'Screen recording permission denied. Please allow screen sharing when prompted.';
        }
      }
      
      // Generic error messages
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        if (this.recordingMode === 'audio-only') {
          return 'Microphone permission denied. Please allow microphone access when prompted.';
        }
        return 'Permission denied. Please allow screen recording when prompted.';
      }
      if (errorMessage.includes('NotSupportedError')) {
        if (this.recordingMode === 'audio-only') {
          return 'Audio recording not supported in this browser. Please use Chrome or Edge.';
        }
        return 'Screen recording not supported in this browser. Please use Chrome or Edge.';
      }
      
      return `Recording failed: ${errorMessage}`;
    }
  
    async stopRecording() {
      if (!this.isRecording || !this.explicitlyStarted) {
        console.log('Not recording or not explicitly started, ignoring stop command');
        return;
      }
  
      return new Promise((resolve) => {
        this.mediaRecorder.onstop = async () => {
          let blob, filename, fallbackUrl;
          
          try {
            // Determine file type based on recording mode
            const isAudioOnly = this.recordingMode === 'audio-only';
            const mimeType = isAudioOnly ? 'audio/webm' : 'video/webm';
            const fileExtension = isAudioOnly ? 'webm' : 'webm';
            
            blob = new Blob(this.recordedChunks, { type: mimeType });
            
            if (blob.size === 0) {
              throw new Error('No recording data available');
            }
            
            filename = `lecture-${new Date().toISOString().replace(/[:.]/g, '-')}.${fileExtension}`;
            fallbackUrl = URL.createObjectURL(blob);
            
            console.log('Recording completed:', {
              blobSize: blob.size,
              filename: filename,
              chunks: this.recordedChunks.length,
              recordingMode: this.recordingMode,
              isAudioOnly: isAudioOnly
            });
            
            // Get auth token from background script
            let authToken = null;
            try {
              const tokenResponse = await chrome.runtime.sendMessage({ type: 'get-auth-token' });
              if (tokenResponse && tokenResponse.success && tokenResponse.token) {
                authToken = tokenResponse.token;
                console.log('Auth token retrieved successfully');
              } else {
                console.warn('No auth token found');
              }
            } catch (storageError) {
              console.error('Failed to get auth token:', storageError);
            }
            
            // Convert blob to base64
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            let base64 = '';
            for (let i = 0; i < uint8Array.length; i++) {
              base64 += String.fromCharCode(uint8Array[i]);
            }
            base64 = btoa(base64);
            
            console.log('Sending to background script for upload...');
            
            // Send to background script for API call
            const response = await chrome.runtime.sendMessage({
              type: 'upload-recording',
              blobData: base64,
              filename: filename,
              apiUrl: window.APP_CONFIG.API_BASE_URL,
              authToken: authToken || null,
              recordingMode: this.recordingMode || 'video-audio'
            }).catch(error => {
              console.error('Failed to send message to background script:', error);
              throw new Error('Failed to communicate with extension background script');
            });
            
            if (response?.success) {
              console.log('Upload successful:', response.data);
              this.showSuccess('Recording uploaded successfully!');
            } else {
              throw new Error(response?.error || 'Upload failed');
            }
          } catch (error) {
            console.error('Upload failed:', error);
            this.showError(error.message);
            
            // Fallback download
            if (blob && filename) {
              try {
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(downloadUrl);
                console.log('Fallback download initiated');
                this.showSuccess('Recording saved locally');
              } catch (downloadError) {
                console.error('Fallback download failed:', downloadError);
              }
            }
          } finally {
            if (fallbackUrl) {
              URL.revokeObjectURL(fallbackUrl);
            }
            
            this.cleanup();
            
            // Notify popup
            try {
              chrome.runtime.sendMessage({ type: 'recording-stopped' }).catch(error => {
                console.log('Recording stopped notification sent');
              });
            } catch (messageError) {
              console.log('Recording stopped notification sent');
            }
            
            resolve();
          }
        };
  
        this.mediaRecorder.stop();
        this.mediaRecorder.stream?.getTracks().forEach(track => track.stop());
      });
    }
  
    cleanup() {
      this.isRecording = false;
      this.explicitlyStarted = false;
      this.recordedChunks = [];
      
      // Stop all media streams
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }
      
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
        this.micStream = null;
      }

      // Close audio context
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      this.updateUI();
    }
  
    showError(message) {
      this.statusText.textContent = `Error: ${message}`;
      this.statusText.style.color = '#ff6b6b';
      setTimeout(() => {
        this.statusText.style.color = 'white';
        this.updateUI();
      }, 5000);
    }
  
    showSuccess(message) {
      this.statusText.textContent = message;
      this.statusText.style.color = '#51cf66';
      setTimeout(() => {
        this.statusText.style.color = 'white';
        this.updateUI();
      }, 3000);
    }
  }
  
  // Initialize recording manager only once
  if (typeof window.recordingManager === 'undefined') {
    console.log('Initializing recording manager...');
    window.recordingManager = new RecordingManager();
    
    window.recordingManagerInitialized = true;
    
    chrome.runtime.onMessage.addListener((message) => {
      console.log('Content script received message:', message.type);
      
      if (message.type === 'start-recording') {
        console.log('Starting recording...', { recordingMode: message.recordingMode });
        window.recordingManager.startRecording(message.recordingMode || 'video-audio');
      } else if (message.type === 'stop-recording') {
        console.log('Stopping recording...');
        window.recordingManager.stopRecording();
      } else if (message.type === 'test-message') {
        console.log('Test message received from popup');
        chrome.runtime.sendMessage({ type: 'test-response', success: true });
      }
    });
    
    console.log('Content script initialized successfully');
  } else {
    console.log('Recording manager already exists, skipping initialization');
  }
  
  if (window.recordingManager && !window.recordingManager.explicitlyStarted) {
    console.log('Recording manager exists but not explicitly started - safe mode');
  }