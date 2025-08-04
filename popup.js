document.addEventListener('DOMContentLoaded', () => {
  // State management
  let isAuthenticated = false;
  let isRecording = false;
  let recordingTimer = null;
  let recordingSeconds = 0;

  // DOM elements - updated to match new HTML structure
  const authSection = document.getElementById('auth-section');
  const recordingControls = document.getElementById('recording-controls');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authContents = document.querySelectorAll('.auth-content');
  
  // Form elements
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const tokenInput = document.getElementById('auth-token');
  
  // Buttons
  const loginBtn = document.getElementById('login-btn');
  const saveTokenBtn = document.getElementById('save-token');
  const startRecordingBtn = document.getElementById('start-recording');
  const stopRecordingBtn = document.getElementById('stop-recording');
  const logoutBtn = document.getElementById('logout');
  
  // Status elements
  const statusIndicator = document.getElementById('status-indicator');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const timer = document.getElementById('timer');

  // Initialize
  initializeUI();
  updateRecordingModeUI(); // Set initial UI state
  checkAuthStatus();

  function initializeUI() {
    // Tab switching
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        switchTab(tabName);
      });
    });

    // Event listeners
    loginBtn.addEventListener('click', handleLogin);
    saveTokenBtn.addEventListener('click', handleSaveToken);
    startRecordingBtn.addEventListener('click', handleStartRecording);
    stopRecordingBtn.addEventListener('click', handleStopRecording);
    logoutBtn.addEventListener('click', handleLogout);

    // Recording mode change handler
    const recordingModeInputs = document.querySelectorAll('input[name="recording-mode"]');
    recordingModeInputs.forEach(input => {
      input.addEventListener('change', updateRecordingModeUI);
    });

    // Enter key handlers
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSaveToken();
    });
  }

  function switchTab(tabName) {
    // Update tab buttons
    authTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    authContents.forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-content`);
    });
  }

  function checkAuthStatus() {
    // Check if user is already authenticated from Chrome storage
    chrome.storage.local.get(['authToken'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to load token from storage:', chrome.runtime.lastError);
        return;
      }
      
      if (result.authToken) {
        setAuthenticated(true);
        console.log('✅ Token loaded from storage:', result.authToken.substring(0, 20) + '...');
      } else {
        console.log('ℹ️ No token found in storage');
        setAuthenticated(false);
      }
    });
  }

  function setAuthenticated(authenticated) {
    isAuthenticated = authenticated;
    document.body.classList.toggle('authenticated', authenticated);
    
    if (authenticated) {
      showMessage('login', 'Welcome to ClassCapsule Recorder!', 'success');
    }
  }

  function showMessage(type, message, className = 'error') {
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

  function setButtonLoading(button, loading) {
    if (loading) {
      button.classList.add('btn-loading');
      button.disabled = true;
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
    }
  }

  async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showMessage('login', 'Please enter both email and password');
      return;
    }

    setButtonLoading(loginBtn, true);

    try {
      console.log('Attempting login for:', email);
      
      // Make login API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log('Making API request to:', `${window.APP_CONFIG.API_BASE_URL}/auth/login`);
      
              const response = await fetch(`${window.APP_CONFIG.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('API response received:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(errorData.message || `Login failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API success response:', data);
      
      if (data.access_token) {
        // Save token to Chrome storage
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ authToken: data.access_token }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
        
        // Also notify background script
        chrome.runtime.sendMessage({ type: 'set-auth-token', token: data.access_token }).catch(error => {
          console.warn('⚠️ Failed to notify background script:', error);
        });
        
        console.log('✅ Login successful, token saved');
        showMessage('login', 'Login successful! Welcome to ClassCapsule.', 'success');
        setAuthenticated(true);
        
        // Clear form
        emailInput.value = '';
        passwordInput.value = '';
        
      } else {
        throw new Error('No access_token received from server');
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        showMessage('login', 'Login timeout: Request took too long. Please try again.');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        showMessage('login', 'Network error: Unable to connect to server. Please check your internet connection.');
      } else {
        showMessage('login', error.message || 'Login failed. Please try again.');
      }
    } finally {
      setButtonLoading(loginBtn, false);
    }
  }

  async function handleSaveToken() {
    const token = tokenInput.value.trim();

    if (!token) {
      showMessage('token', 'Please enter a valid token');
      return;
    }

    setButtonLoading(saveTokenBtn, true);

    try {
      console.log('Attempting to save token:', token.substring(0, 20) + '...');
      
      // Save token to Chrome storage
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ authToken: token }, () => {
          if (chrome.runtime.lastError) {
            console.error('❌ Failed to save token:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('✅ Token saved successfully');
            resolve();
          }
        });
      });
      
      // Also notify background script
      chrome.runtime.sendMessage({ type: 'set-auth-token', token }).catch(error => {
        console.warn('⚠️ Failed to notify background script:', error);
      });
      
      showMessage('token', 'Token saved successfully!', 'success');
      setAuthenticated(true);
      
    } catch (error) {
      console.error('❌ Failed to save token:', error);
      showMessage('token', `Error saving token: ${error.message}`);
    } finally {
      setButtonLoading(saveTokenBtn, false);
    }
  }

  async function handleStartRecording() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      setButtonLoading(startRecordingBtn, true);
      statusText.textContent = "Starting recording...";
      
      // Get selected recording mode
      const recordingMode = document.querySelector('input[name="recording-mode"]:checked').value;
      console.log('Selected recording mode:', recordingMode);
      
      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      // Wait a moment for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await chrome.tabs.sendMessage(tab.id, { 
        type: 'start-recording',
        recordingMode: recordingMode
      });
      
      // Update UI
      isRecording = true;
      recordingSeconds = 0;
      startRecordingBtn.classList.add('hidden');
      stopRecordingBtn.classList.remove('hidden');
      statusIndicator.classList.add('recording');
      statusDot.classList.add('recording');
      statusText.textContent = recordingMode === 'audio-only' ? 'Recording audio...' : 'Recording in progress...';
      timer.classList.remove('hidden');
      
      // Start timer
      recordingTimer = setInterval(() => {
        recordingSeconds++;
        updateTimer();
      }, 1000);
      
      showRecordingNotification(`Recording started! (${recordingMode === 'audio-only' ? 'Audio Only' : 'Video + Audio'})`, 'success');
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      statusText.textContent = `Error: ${error.message}`;
      showRecordingNotification('Failed to start recording', 'error');
    } finally {
      setButtonLoading(startRecordingBtn, false);
    }
  }

  async function handleStopRecording() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      setButtonLoading(stopRecordingBtn, true);
      statusText.textContent = "Stopping recording...";
      
      // Try to send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'stop-recording' });
      } catch (messageError) {
        console.warn('Failed to send stop message, trying to re-inject content script:', messageError.message);
        // If content script is not responding, try to re-inject it
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await new Promise(resolve => setTimeout(resolve, 200));
          await chrome.tabs.sendMessage(tab.id, { type: 'stop-recording' });
        } catch (reinjectError) {
          console.error('Failed to re-inject content script:', reinjectError.message);
          statusText.textContent = "Error: Could not communicate with recording";
        }
      }
      
      // Update UI
      isRecording = false;
      
      // Clear timer
      if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
      }
      
      // Update UI
      startRecordingBtn.classList.remove('hidden');
      stopRecordingBtn.classList.add('hidden');
      statusIndicator.classList.remove('recording');
      statusDot.classList.remove('recording');
      statusText.textContent = 'Processing recording...';
      
      setTimeout(() => {
        statusText.textContent = 'Ready to record';
        timer.classList.add('hidden');
        recordingSeconds = 0;
      }, 2000);

      showRecordingNotification(`Recording stopped after ${formatTime(recordingSeconds)}`, 'success');
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      statusText.textContent = `Error: ${error.message}`;
    } finally {
      setButtonLoading(stopRecordingBtn, false);
    }
  }

  async function handleLogout() {
    try {
      setButtonLoading(logoutBtn, true);
      statusText.textContent = "Logging out...";
      
      // Clear token from Chrome storage
      await new Promise((resolve, reject) => {
        chrome.storage.local.remove(['authToken'], () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      
      // Notify background script to clear token
      chrome.runtime.sendMessage({ type: 'set-auth-token', token: null }).catch(error => {
        console.warn('⚠️ Failed to notify background script:', error);
      });
      
      // Clear form fields
      emailInput.value = '';
      passwordInput.value = '';
      tokenInput.value = '';
      
      // Reset recording state
      if (isRecording) {
        handleStopRecording();
      }
      
      setAuthenticated(false);
      console.log('✅ Logout successful');
      showMessage('login', 'Logged out successfully', 'success');
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
      showMessage('login', `Logout failed: ${error.message}`);
    } finally {
      setButtonLoading(logoutBtn, false);
    }
  }

  function updateTimer() {
    timer.textContent = formatTime(recordingSeconds);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateRecordingModeUI() {
    const selectedMode = document.querySelector('input[name="recording-mode"]:checked').value;
    const startButton = document.getElementById('start-recording');
    
    // Update button text based on selected mode
    if (selectedMode === 'audio-only') {
      startButton.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,10C19,13.53 16.39,16.44 13,16.9V20H15A1,1 0 0,1 16,21A1,1 0 0,1 15,22H9A1,1 0 0,1 8,21A1,1 0 0,1 9,20H11V16.9C7.61,16.44 5,13.53 5,10H7A5,5 0 0,0 12,15A5,5 0 0,0 17,10H19Z"/>
        </svg>
        Start Audio Recording
      `;
    } else {
      startButton.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M8.5,8.64L13.77,12L8.5,15.36V8.64M6.5,5V19L17.5,12"/>
        </svg>
        Start Recording
      `;
    }
  }

  function showRecordingNotification(message, type) {
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

  // Listen for recording status updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'recording-stopped') {
      statusText.textContent = "Recording stopped";
      stopRecordingBtn.classList.add('hidden');
      startRecordingBtn.classList.remove('hidden');
      setButtonLoading(startRecordingBtn, false);
      setButtonLoading(stopRecordingBtn, false);
    }
  });
});