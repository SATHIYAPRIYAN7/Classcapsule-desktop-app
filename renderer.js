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
    this.isInitialLoad = true;
    
    this.initializeElements();
    this.initializeEventListeners();
    this.initializeElectronListeners();
    
    // Hide auth section initially to prevent flash
    this.authSection.style.display = 'none';
    this.recordingControls.style.display = 'none';
    
    // Start initialization immediately without loading state
    this.initializeApp();
  }

  async initializeApp() {
    // Check authentication status first (fast operation)
    await this.checkAuthStatus();
    
    // If authenticated, show recording controls immediately
    if (this.isAuthenticated) {
      console.log('🚀 User is authenticated, showing recording controls immediately');
      
      // Load other preferences in background (non-blocking)
      setTimeout(() => {
        this.loadAudioPreferences();
        this.loadRecordingModePreference();
        this.loadUploadHistory();
        this.testScreenRecordingAPIs();
      }, 100);
    } else {
      // Show loading state only if not authenticated
      this.showLoadingState();
      
      // Load preferences and history
      this.loadAudioPreferences();
      this.loadRecordingModePreference();
      this.loadUploadHistory();
      this.testScreenRecordingAPIs();
      
      // Hide loading state
      this.hideLoadingState();
    }


  }

  showLoadingState() {
    // Add loading class to body with reduced opacity only
    document.body.classList.add('loading');
  }

  hideLoadingState() {
    // Remove loading class from body
    document.body.classList.remove('loading');
  }

  // Test method for debugging token persistence
  async testTokenPersistence() {
    console.log('🧪 Testing token persistence...');
    
    // Check current token
    const currentToken = await this.debugTokenStorage();
    
    if (currentToken && currentToken.token) {
      console.log('✅ Token exists, testing re-authentication...');
      
      // Simulate app restart by clearing authentication state
      this.isAuthenticated = false;
      this.authSection.style.display = 'block';
      this.recordingControls.style.display = 'none';
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check authentication again
      await this.checkAuthStatus();
      
      console.log('🧪 Token persistence test completed');
    } else {
      console.log('❌ No token found for persistence test');
    }
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
    
    // Upload status elements
    this.uploadList = document.getElementById('upload-list');
    this.clearUploadsBtn = document.getElementById('clear-uploads');
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
    
    // Recording mode selector event listeners
    const recordingModeInputs = document.querySelectorAll('input[name="recording-mode"]');
    recordingModeInputs.forEach(input => {
      input.addEventListener('change', () => {
        this.updateRecordingModeUI();
        this.saveRecordingModePreference();
      });
    });
    
    // Upload status event listeners
    if (this.clearUploadsBtn) {
      this.clearUploadsBtn.addEventListener('click', () => {
        this.clearUploadHistory();
      });
    }
    
    // CTA link event listener
    const ctaLink = document.querySelector('.cta-link');
    if (ctaLink) {
      ctaLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.openExternalLink('https://class-capsule-demo.netlify.app/');
      });
    }
    
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
        console.log('✅ Token found, authenticating user');
        this.setAuthenticated(true);
      } else {
        console.log('ℹ️ No token found, showing login screen');
        this.setAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Failed to load token from storage:', error);
      this.setAuthenticated(false);
    }
  }

  // Debug method to check token persistence
  async debugTokenStorage() {
    try {
      const result = await window.electronAPI.getAuthToken();
      console.log('🔍 Debug - Token storage check:', {
        success: result.success,
        hasToken: !!result.token,
        tokenLength: result.token ? result.token.length : 0,
        tokenPreview: result.token ? result.token.substring(0, 20) + '...' : 'null'
      });
      
      // Also log the current authentication state
      console.log('🔍 Debug - Current auth state:', {
        isAuthenticated: this.isAuthenticated,
        authSectionDisplay: this.authSection.style.display,
        recordingControlsDisplay: this.recordingControls.style.display
      });
      
      return result;
    } catch (error) {
      console.error('❌ Debug - Token storage error:', error);
      return null;
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      return false;
    }
  }

  setAuthenticated(authenticated) {
    this.isAuthenticated = authenticated;
    document.body.classList.toggle('authenticated', authenticated);
    document.body.classList.toggle('show-auth', !authenticated);
    
    if (authenticated) {
      // Show recording controls immediately
      this.recordingControls.style.display = 'block';
      
      // Clear any existing messages
      this.clearMessages();
      
      // Show welcome message (only if not initial load)
      if (!this.isInitialLoad) {
        this.showMessage('login', 'Welcome to ClassCapsule Recorder!', 'success');
      }
      
      // Clear form inputs
      this.emailInput.value = '';
      this.passwordInput.value = '';
      this.tokenInput.value = '';
      
      console.log('✅ User authenticated, showing recording controls');
    } else {
      // Show auth section
      this.authSection.style.display = 'block';
      this.recordingControls.style.display = 'none';
      
      // Clear any existing messages
      this.clearMessages();
      
      console.log('ℹ️ User not authenticated, showing login screen');
    }
    
    // Mark that initial load is complete
    this.isInitialLoad = false;
  }

  clearMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
      msg.classList.add('hidden');
      msg.textContent = '';
    });
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
      
      const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/auth/login`, {
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
        console.log('🔑 Received access token from server');
        
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
        console.log('✅ Token saved successfully');
        this.showMessage('token', 'Token saved successfully! Welcome to ClassCapsule.', 'success');
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
      
      // Get selected recording mode
      const recordingMode = this.getSelectedRecordingMode();
      console.log('Selected recording mode:', recordingMode);
      
      if (recordingMode === 'audio-only') {
        this.statusText.textContent = "Starting audio recording...";
      } else {
        this.statusText.textContent = "Starting recording...";
      }
      
      // Get screen sources first (needed for video recording and system audio)
      let sourcesResult = null;
      if (recordingMode !== 'audio-only' || this.systemAudioToggle.checked) {
        sourcesResult = await window.electronAPI.getScreenSources();
        if (!sourcesResult.success) {
          throw new Error(sourcesResult.error || 'Failed to get screen sources');
        }
      }

      // Start the actual recording
      if (recordingMode === 'audio-only') {
        await this.startAudioOnlyRecording(sourcesResult?.sources);
      } else {
        await this.startScreenRecording(sourcesResult.sources);
      }

      // Start recording process in main process
      const startResult = await window.electronAPI.startRecording();
      if (!startResult.success) {
        throw new Error(startResult.error || 'Failed to start recording');
      }

      // Update UI
      this.isRecording = true;
      console.log('Updating UI for recording state...');
      console.log('Start button before:', this.startRecordingBtn.classList.contains('hidden'));
      console.log('Stop button before:', this.stopRecordingBtn.classList.contains('hidden'));
      
      this.startRecordingBtn.classList.add('hidden');
      this.stopRecordingBtn.classList.remove('hidden');
      
      console.log('Start button after:', this.startRecordingBtn.classList.contains('hidden'));
      console.log('Stop button after:', this.stopRecordingBtn.classList.contains('hidden'));
      
      this.statusIndicator.classList.add('recording');
      this.statusDot.classList.add('recording');
      this.statusText.textContent = recordingMode === 'audio-only' ? 'Recording audio...' : 'Recording in progress...';
      this.timer.classList.remove('hidden');
      
      // Show recording overlay
      this.showRecordingOverlay();
      
      this.showRecordingNotification(`Recording started! (${recordingMode === 'audio-only' ? 'Audio Only' : 'Video + Audio'})`, 'success');
      
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
          
          // Enhanced microphone access for macOS
          const micConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 2
            },
            video: false
          };
          
          // For macOS, try a more permissive approach
          if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
            console.log('macOS detected - using enhanced microphone access');
            
            // First try to get microphone access directly
            try {
              this.micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
              console.log('Microphone access granted successfully on macOS');
            } catch (directError) {
              console.log('Direct microphone access failed, trying alternative approach:', directError.message);
              
              // Try with more basic constraints
              this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
              });
              console.log('Microphone access granted with basic constraints on macOS');
            }
          } else {
            // For other platforms, use standard approach
            this.micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
            console.log('Microphone access granted successfully');
          }
          
          // Verify microphone access
          if (this.micStream && this.micStream.getAudioTracks().length > 0) {
            console.log(`Microphone access confirmed: ${this.micStream.getAudioTracks().length} audio track(s)`);
          } else {
            throw new Error('No audio tracks available from microphone');
          }
          
        } catch (micError) {
          console.error('Microphone access failed:', micError);
          
          // Enhanced error messages for macOS
          if (micError.name === 'NotAllowedError') {
            if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
              throw new Error('Microphone access denied on macOS. Please:\n1. Go to System Preferences > Security & Privacy > Privacy > Microphone\n2. Add "ClassCapsule Recorder" to the list\n3. Check the box next to the app\n4. Restart the app completely');
            } else {
              throw new Error('Microphone access denied. Please grant microphone permission and restart the app.');
            }
          } else if (micError.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.');
          } else if (micError.name === 'NotSupportedError') {
            throw new Error('Microphone not supported or not available on this device.');
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

  async startAudioOnlyRecording(sources = null) {
    try {
      console.log('Starting audio-only recording...');

      // Get system audio using a simpler approach for audio-only mode
      this.screenStream = null;
      if (this.systemAudioToggle.checked) {
        try {
          console.log('Requesting system audio for audio-only recording...');
          
          // If we have screen sources, try using them first (like video+audio mode)
          if (sources && sources.length > 0) {
            console.log('Using screen sources for system audio capture...');
            const source = sources[0];
            console.log('Selected source:', source.name);
            
            try {
              // Try using getDisplayMedia first (same as video+audio mode)
              this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 },
                  frameRate: { ideal: 24, max: 30 }
                },
                audio: this.systemAudioToggle.checked
              });
              console.log('Using getDisplayMedia successfully for audio-only');
            } catch (displayMediaError) {
              console.log('getDisplayMedia failed, trying getUserMedia with source ID');
              
              // Fallback to getUserMedia with source ID (same as video+audio mode)
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
          } else {
            // Fallback to multiple approaches if no sources available
            console.log('No screen sources available, trying multiple approaches...');
            
            // Try multiple approaches for system audio capture
            const approaches = [
              // Approach 1: Minimal video with audio
              {
                video: { width: 1, height: 1, frameRate: 1 },
                audio: true
              },
              // Approach 2: No video, audio only (if supported)
              {
                video: false,
                audio: true
              },
              // Approach 3: Standard video with audio
              {
                video: {
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 },
                  frameRate: { ideal: 24, max: 30 }
                },
                audio: true
              }
            ];
            
            let success = false;
            for (let i = 0; i < approaches.length; i++) {
              try {
                console.log(`Trying system audio approach ${i + 1}...`);
                this.screenStream = await navigator.mediaDevices.getDisplayMedia(approaches[i]);
                
                if (this.screenStream && this.screenStream.getAudioTracks().length > 0) {
                  console.log(`System audio access granted with approach ${i + 1}`);
                  console.log('System audio tracks:', this.screenStream.getAudioTracks().length);
                  success = true;
                  break;
                } else {
                  console.warn(`Approach ${i + 1} failed - no audio tracks`);
                  this.screenStream = null;
                }
              } catch (approachError) {
                console.warn(`Approach ${i + 1} failed:`, approachError.message);
                this.screenStream = null;
              }
            }
            
            if (!success) {
              console.error('All system audio capture approaches failed');
              this.screenStream = null;
            }
          }
        } catch (screenError) {
          console.warn('System audio access denied for audio-only recording:', screenError);
          this.screenStream = null;
          
          // Provide more specific error information
          if (screenError.name === 'NotAllowedError') {
            console.error('System audio permission denied. User needs to grant screen sharing permission.');
          } else if (screenError.name === 'NotSupportedError') {
            console.error('System audio not supported on this platform/browser.');
          } else {
            console.error('System audio capture failed:', screenError.message);
          }
        }
      }

      // Get microphone audio using the same approach as video+audio mode
      this.micStream = null;
      if (this.micAudioToggle.checked) {
        try {
          console.log('Requesting microphone access for audio-only recording...');
          
          // Use the same microphone constraints as video+audio mode
          const micConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 2
            },
            video: false
          };
          
          // For macOS, try a more permissive approach (same as video+audio mode)
          if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
            console.log('macOS detected - using enhanced microphone access');
            
            // First try to get microphone access directly
            try {
              this.micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
              console.log('Microphone access granted successfully on macOS');
            } catch (directError) {
              console.log('Direct microphone access failed, trying alternative approach:', directError.message);
              
              // Try with more basic constraints
              this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
              });
              console.log('Microphone access granted with basic constraints on macOS');
            }
          } else {
            // For other platforms, use standard approach
            this.micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
            console.log('Microphone access granted successfully');
          }
          
          // Verify microphone access
          if (this.micStream && this.micStream.getAudioTracks().length > 0) {
            console.log(`Microphone access confirmed: ${this.micStream.getAudioTracks().length} audio track(s)`);
          } else {
            throw new Error('No audio tracks available from microphone');
          }
          
        } catch (micError) {
          console.error('Microphone access failed:', micError);
          
          // Enhanced error messages for macOS
          if (micError.name === 'NotAllowedError') {
            if (navigator.platform === 'MacIntel' || navigator.platform === 'MacPPC') {
              throw new Error('Microphone access denied on macOS. Please:\n1. Go to System Preferences > Security & Privacy > Privacy > Microphone\n2. Add "ClassCapsule Recorder" to the list\n3. Check the box next to the app\n4. Restart the app completely');
            } else {
              throw new Error('Microphone access denied. Please grant microphone permission and restart the app.');
            }
          } else if (micError.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.');
          } else if (micError.name === 'NotSupportedError') {
            throw new Error('Microphone not supported or not available on this device.');
          } else {
            throw new Error(`Microphone access failed: ${micError.message}`);
          }
        }
      } else {
        console.log('Microphone recording disabled by user');
      }

      // Check if we have at least one audio source
      console.log('Audio source check:');
      console.log('- System audio enabled:', this.systemAudioToggle.checked);
      console.log('- Microphone enabled:', this.micAudioToggle.checked);
      console.log('- Screen stream available:', !!this.screenStream);
      console.log('- Mic stream available:', !!this.micStream);
      
      if (this.screenStream) {
        console.log('- Screen stream audio tracks:', this.screenStream.getAudioTracks().length);
      }
      if (this.micStream) {
        console.log('- Mic stream audio tracks:', this.micStream.getAudioTracks().length);
      }
      
      // Check if we have at least one working audio source
      const hasScreenAudio = this.screenStream && this.screenStream.getAudioTracks().length > 0;
      const hasMicAudio = this.micStream && this.micStream.getAudioTracks().length > 0;
      
      console.log('- Has screen audio:', hasScreenAudio);
      console.log('- Has mic audio:', hasMicAudio);
      
      if (!hasScreenAudio && !hasMicAudio) {
        // Provide more specific error message based on what was attempted
        if (this.systemAudioToggle.checked && this.micAudioToggle.checked) {
          throw new Error('Both system audio and microphone capture failed. Please check your permissions and try again. If you only want to record microphone, disable system audio and try again.');
        } else if (this.systemAudioToggle.checked) {
          throw new Error('System audio capture failed. Please check your screen sharing permissions and try again. You can also try enabling microphone as an alternative.');
        } else if (this.micAudioToggle.checked) {
          throw new Error('Microphone capture failed. Please check your microphone permissions and try again.');
        } else {
          throw new Error('No audio sources available. Please enable system audio or microphone in the settings.');
        }
      }

      // Create audio context for mixing (same as video+audio mode)
      const audioContext = new AudioContext();
      const mixedAudio = audioContext.createMediaStreamDestination();
      
      // Add screen audio if available and enabled (same as video+audio mode)
      if (this.systemAudioToggle.checked && this.screenStream && this.screenStream.getAudioTracks().length > 0) {
        const screenSource = audioContext.createMediaStreamSource(this.screenStream);
        screenSource.connect(mixedAudio);
        console.log('System audio added to mix');
      } else {
        console.log('System audio disabled by user or not available');
      }
      
      // Add microphone audio if available and enabled (same as video+audio mode)
      if (this.micAudioToggle.checked && this.micStream && this.micStream.getAudioTracks().length > 0) {
        const micSource = audioContext.createMediaStreamSource(this.micStream);
        micSource.connect(mixedAudio);
        console.log('Microphone audio added to mix');
      } else {
        console.log('Microphone audio disabled by user or not available');
      }

      // Get the mixed audio stream
      const finalAudioStream = mixedAudio.stream;
      
      console.log('Final audio stream created with:', {
        audioTracks: finalAudioStream.getAudioTracks().length,
        systemAudioEnabled: this.systemAudioToggle.checked,
        micAudioEnabled: this.micAudioToggle.checked
      });
      
      // Verify we have at least one audio track in the final stream
      if (finalAudioStream.getAudioTracks().length === 0) {
        console.error('No audio tracks in final stream - this should not happen');
        throw new Error('Failed to create audio stream. Please try again.');
      }
      
      // Create media recorder for audio-only
      const mimeType = this.getAudioOnlyMimeType();
      console.log('Using audio-only MIME type:', mimeType);
      
      this.mediaRecorder = new MediaRecorder(finalAudioStream, {
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
        throw new Error('Audio recording error occurred');
      };
      
      this.mediaRecorder.onstart = () => {
        console.log('Audio MediaRecorder started successfully');
      };
      
      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingComplete();
      };
      
      this.mediaRecorder.start(1000); // Collect chunks every 1 second
      
      console.log('Audio-only recording started successfully with mixed audio sources');
    } catch (error) {
      console.error('Audio-only recording failed:', error);
      throw error;
    }
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
      console.log('Creating mixed audio stream...');
      
      // Create audio context for mixing
      const audioContext = new AudioContext();
      const mixedAudio = audioContext.createMediaStreamDestination();
      
      let audioSourcesAdded = 0;
      
      // Add system audio if available
      if (this.screenStream && this.screenStream.getAudioTracks().length > 0) {
        try {
          const screenSource = audioContext.createMediaStreamSource(this.screenStream);
          screenSource.connect(mixedAudio);
          console.log('System audio added to mix');
          audioSourcesAdded++;
        } catch (screenError) {
          console.warn('Failed to add system audio to mix:', screenError);
        }
      }
      
      // Add microphone audio if available
      if (this.micStream && this.micStream.getAudioTracks().length > 0) {
        try {
          const micSource = audioContext.createMediaStreamSource(this.micStream);
          micSource.connect(mixedAudio);
          console.log('Microphone audio added to mix');
          audioSourcesAdded++;
        } catch (micError) {
          console.warn('Failed to add microphone audio to mix:', micError);
        }
      }

      if (audioSourcesAdded === 0) {
        throw new Error('No audio sources could be added to the mix');
      }

      console.log(`Mixed audio stream created successfully with ${audioSourcesAdded} audio sources`);
      return mixedAudio.stream;
    } catch (error) {
      console.error('Failed to create mixed audio stream:', error);
      // Fallback to microphone only if mixing fails
      if (this.micStream && this.micStream.getAudioTracks().length > 0) {
        console.log('Falling back to microphone only');
        return this.micStream;
      } else if (this.screenStream && this.screenStream.getAudioTracks().length > 0) {
        console.log('Falling back to system audio only');
        return this.screenStream;
      } else {
        throw new Error('No audio sources available for mixing');
      }
    }
  }

  async handleRecordingComplete() {
    try {
      if (this.recordedChunks.length === 0) {
        console.warn('No recording data available');
        return;
      }

      // Determine file type based on recording mode
      const recordingMode = this.getSelectedRecordingMode();
      const isAudioOnly = recordingMode === 'audio-only';
      const mimeType = isAudioOnly ? 'audio/webm' : 'video/webm';
      const fileExtension = isAudioOnly ? 'webm' : 'webm';
      
      const blob = new Blob(this.recordedChunks, { type: mimeType });
      const filename = `lecture-${new Date().toISOString().replace(/[:.]/g, '-')}.${fileExtension}`;

      console.log('Recording completed, preparing to upload...', {
        blobSize: blob.size,
        filename: filename,
        sizeMB: (blob.size / 1024 / 1024).toFixed(2),
        recordingMode: recordingMode,
        isAudioOnly: isAudioOnly
      });

      // Add upload item to UI
      const uploadId = this.addUploadItem({
        filename: filename,
        size: blob.size,
        recordingMode: recordingMode
      });

      // Get auth token
      const authResult = await window.electronAPI.getAuthToken();
      const authToken = authResult.success ? authResult.token : null;

      if (!authToken) {
        this.updateUploadProgress(uploadId, 0, 'error');
        throw new Error('No authentication token available. Please login first.');
      }

      // Check file size and decide upload method
      const fileSizeMB = blob.size / 1024 / 1024;
      
      if (fileSizeMB < 10) {
        // Small file - use regular upload
        console.log('Using regular upload for small file');
        await this.uploadSmallFile(blob, filename, authToken, uploadId);
      } else {
        // Large file - use multipart upload
        console.log('Using multipart upload for large file');
        await this.uploadLargeFile(blob, filename, authToken, uploadId);
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

  async uploadSmallFile(blob, filename, authToken, uploadId) {
   // this.statusText.textContent = 'Preparing upload...';
    this.updateUploadProgress(uploadId, 10, 'uploading');
    
    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let base64 = '';
    for (let i = 0; i < uint8Array.length; i++) {
      base64 += String.fromCharCode(uint8Array[i]);
    }
    base64 = btoa(base64);

    //this.statusText.textContent = 'Uploading - 50%';
    this.updateUploadProgress(uploadId, 50, 'uploading');

    // Upload using the existing upload function
    const uploadResult = await window.electronAPI.uploadRecording({
      blobData: base64,
      filename: filename,
      apiUrl: window.APP_CONFIG.API_BASE_URL,
      authToken: authToken
    });

    // Show completion progress
    //this.statusText.textContent = 'Uploading - 100%';
    this.updateUploadProgress(uploadId, 100, 'success');

    if (uploadResult.success) {
      console.log('Upload successful:', uploadResult.data);
      this.showRecordingNotification('Recording uploaded successfully!', 'success');
    } else {
      this.updateUploadProgress(uploadId, 0, 'error');
      throw new Error(uploadResult.error || 'Upload failed');
    }
  }

  async uploadLargeFile(blob, filename, authToken, uploadId) {
    try {
      //this.statusText.textContent = 'Starting multipart upload...';
      this.updateUploadProgress(uploadId, 5, 'uploading');
      
      // Start multipart upload
      const startResult = await window.electronAPI.startMultipartUpload({
        filename: filename,
        fileSize: blob.size,
        contentType: 'video/webm',
        authToken: authToken
      });

      if (!startResult.success) {
        this.updateUploadProgress(uploadId, 0, 'error');
        throw new Error(startResult.error || 'Failed to start multipart upload');
      }

      const { uploadId } = startResult.data;
      console.log('UploadId:', uploadId);

      //this.statusText.textContent = 'Generating upload URLs...';
      this.updateUploadProgress(uploadId, 15, 'uploading');

      // Generate presigned URLs
      const presignedResult = await window.electronAPI.generatePresignedUrls({
        filename: filename,
        uploadId: uploadId,
        fileSize: blob.size,
        authToken: authToken
      });

      if (!presignedResult.success) {
        this.updateUploadProgress(uploadId, 0, 'error');
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
       // this.statusText.textContent = `Uploading - ${progress}%`;
        this.updateUploadProgress(uploadId, 20 + (progress * 0.7), 'uploading');

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

     // this.statusText.textContent = 'Completing upload...';
      this.updateUploadProgress(uploadId, 90, 'uploading');

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
        this.updateUploadProgress(uploadId, 100, 'success');
        this.showRecordingNotification('Recording uploaded successfully!', 'success');
      } else {
        this.updateUploadProgress(uploadId, 0, 'error');
        throw new Error(completeResult.error || 'Failed to complete multipart upload');
      }

    } catch (error) {
      console.error('Multipart upload failed:', error);
      if (uploadId) {
        this.updateUploadProgress(uploadId, 0, 'error');
      }
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

  updateRecordingModeUI() {
    const selectedMode = document.querySelector('input[name="recording-mode"]:checked').value;
    
    // Update button text based on selected mode
    if (selectedMode === 'audio-only') {
      this.startRecordingBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,10C19,13.53 16.39,16.44 13,16.9V20H15A1,1 0 0,1 16,21A1,1 0 0,1 15,22H9A1,1 0 0,1 8,21A1,1 0 0,1 9,20H11V16.9C7.61,16.44 5,13.53 5,10H7A5,5 0 0,0 12,15A5,5 0 0,0 17,10H19Z"/>
        </svg>
        Start Audio Recording
      `;
    } else {
      this.startRecordingBtn.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M8.5,8.64L13.77,12L8.5,15.36V8.64M6.5,5V19L17.5,12"/>
        </svg>
        Start Recording
      `;
    }
    
    console.log('Recording mode updated:', selectedMode);
  }

  saveRecordingModePreference() {
    const selectedMode = document.querySelector('input[name="recording-mode"]:checked').value;
    
    try {
      localStorage.setItem('recordingMode', selectedMode);
      console.log('Recording mode preference saved:', selectedMode);
    } catch (error) {
      console.error('Failed to save recording mode preference:', error);
    }
  }

  loadRecordingModePreference() {
    try {
      const savedMode = localStorage.getItem('recordingMode');
      if (savedMode) {
        const radioButton = document.querySelector(`input[name="recording-mode"][value="${savedMode}"]`);
        if (radioButton) {
          radioButton.checked = true;
          this.updateRecordingModeUI();
          console.log('Recording mode preference loaded:', savedMode);
        }
      } else {
        // Default to video-audio
        const defaultRadio = document.querySelector('input[name="recording-mode"][value="video-audio"]');
        if (defaultRadio) {
          defaultRadio.checked = true;
          this.updateRecordingModeUI();
          console.log('Using default recording mode: video-audio');
        }
      }
    } catch (error) {
      console.error('Failed to load recording mode preference:', error);
      // Fallback to default
      const defaultRadio = document.querySelector('input[name="recording-mode"][value="video-audio"]');
      if (defaultRadio) {
        defaultRadio.checked = true;
        this.updateRecordingModeUI();
      }
    }
  }

  getSelectedRecordingMode() {
    const selectedMode = document.querySelector('input[name="recording-mode"]:checked');
    return selectedMode ? selectedMode.value : 'video-audio';
  }
  
  // Upload Status Management
  addUploadItem(uploadData) {
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const uploadItem = {
      id: uploadId,
      filename: uploadData.filename,
      status: 'uploading',
      progress: 0,
      size: uploadData.size || 0,
      timestamp: new Date().toISOString()
    };
    
    // Add to UI only (no localStorage persistence)
    this.renderUploadItem(uploadItem);
    
    return uploadId;
  }
  
  updateUploadProgress(uploadId, progress, status = 'uploading') {
    // Update UI only (no localStorage persistence)
    this.updateUploadItemUI(uploadId, progress, status);
  }
  
  renderUploadItem(uploadItem) {
    if (!this.uploadList) return;
    
    const uploadElement = document.createElement('div');
    uploadElement.className = 'upload-item';
    uploadElement.id = `upload-item-${uploadItem.id}`;
    
    const fileSize = this.formatFileSize(uploadItem.size);
    const uploadTime = this.formatUploadTime(new Date(uploadItem.timestamp));
    
    uploadElement.innerHTML = `
      <div class="upload-item-header">
        <div class="upload-filename" title="${uploadItem.filename}">${uploadItem.filename}</div>
        <div class="upload-status ${uploadItem.status}">${this.getStatusText(uploadItem.status)}</div>
      </div>
      <div class="upload-progress">
        <div class="upload-progress-bar" style="width: ${uploadItem.progress}%"></div>
      </div>
      <div class="upload-details">
        <span class="upload-time">${uploadTime}</span>
        <span class="upload-size">${fileSize}</span>
      </div>
    `;
    
    // Add the new item at the beginning
    this.uploadList.insertBefore(uploadElement, this.uploadList.firstChild);
    
    // Keep only the latest 2 recordings
    this.limitUploadItemsToLatest(2);
  }
  
  updateUploadItemUI(uploadId, progress, status) {
    const uploadElement = document.getElementById(`upload-item-${uploadId}`);
    if (!uploadElement) return;
    
    const progressBar = uploadElement.querySelector('.upload-progress-bar');
    const statusElement = uploadElement.querySelector('.upload-status');
    
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    
    if (statusElement) {
      statusElement.className = `upload-status ${status}`;
      statusElement.textContent = this.getStatusText(status);
    }
  }

  limitUploadItemsToLatest(maxItems) {
    if (!this.uploadList) return;
    
    const uploadItems = this.uploadList.querySelectorAll('.upload-item');
    
    // If we have more than maxItems, remove the oldest ones
    if (uploadItems.length > maxItems) {
      const itemsToRemove = uploadItems.length - maxItems;
      
      // Remove the oldest items (they are at the bottom of the list)
      for (let i = 0; i < itemsToRemove; i++) {
        const lastItem = uploadItems[uploadItems.length - 1 - i];
        if (lastItem) {
          lastItem.remove();
        }
      }
    }
  }
  
  getStatusText(status) {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'success': return 'Uploaded';
      case 'error': return 'Failed';
      default: return 'Unknown';
    }
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  formatUploadTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }
  

  
  clearUploadHistory() {
    if (confirm('Are you sure you want to clear all upload history?')) {
      if (this.uploadList) {
        this.uploadList.innerHTML = '';
      }
      console.log('Upload history cleared');
    }
  }
  
  loadUploadHistory() {
    // No persistence - just clear the list
    if (this.uploadList) {
      this.uploadList.innerHTML = '';
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.recordingApp = new RecordingApp();
  
  // Expose debug methods globally for testing
  window.debugTokenPersistence = () => window.recordingApp.testTokenPersistence();
  window.debugTokenStorage = () => window.recordingApp.debugTokenStorage();
  window.checkAuthStatus = () => window.recordingApp.checkAuthStatus();
});
