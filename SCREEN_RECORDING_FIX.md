# Screen Recording Fix for Windows and Mac

## Issues Fixed

### Windows Issues:
- **"could not start audio source"** error
- Audio mixing problems
- Driver compatibility issues

### Mac Issues:
- **"Failed to start recording"** error
- Permission problems
- Audio context issues

## Changes Made

### 1. Updated `manifest.json`
- Added `"microphone"` permission
- Added proper host permissions for API endpoints
- Improved cross-platform compatibility

### 2. Completely Rewrote `content.js`
- **Platform Detection**: Added automatic detection of Windows/Mac
- **Better Audio Handling**: Improved audio mixing with fallback options
- **Enhanced Error Messages**: Platform-specific error messages
- **Robust Codec Support**: Multiple WebM codec fallbacks
- **Improved Cleanup**: Proper resource management

### 3. Key Improvements

#### Audio Handling:
```javascript
// Platform-specific audio configuration
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  sampleRate: 44100
}
```

#### Error Handling:
```javascript
// Platform-specific error messages
if (this.isMac()) {
  return 'Screen recording permission denied. Please allow screen recording in System Preferences...';
} else if (this.isWindows()) {
  return 'Audio recording failed. Please ensure your audio drivers are working...';
}
```

#### Codec Support:
```javascript
const types = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm'
];
```

## Testing Your Fix

### 1. Use the Test Page
Open `test-recording.html` in your browser to:
- Test browser compatibility
- Check permissions
- Verify screen recording works

### 2. Manual Testing Steps

#### For Windows:
1. **Check Audio Drivers**:
   - Open Device Manager
   - Verify audio drivers are working
   - Test microphone in Windows settings

2. **Browser Permissions**:
   - Allow screen sharing when prompted
   - Allow microphone access if requested

3. **Test Recording**:
   - Open the extension
   - Try recording with and without microphone
   - Check if audio is captured

#### For Mac:
1. **System Permissions**:
   ```
   System Preferences > Security & Privacy > Privacy > Screen Recording
   ```
   - Add Chrome/Edge to allowed applications

2. **Microphone Permissions**:
   ```
   System Preferences > Security & Privacy > Privacy > Microphone
   ```
   - Add Chrome/Edge to microphone permissions

3. **Restart Browser**:
   - Close Chrome/Edge completely
   - Reopen and test again

## Troubleshooting Guide

### Common Windows Issues:

#### "could not start audio source"
**Solution:**
1. Check Windows audio settings
2. Update audio drivers
3. Try recording without microphone first
4. Restart browser

#### Audio not working
**Solution:**
1. Test microphone in Windows settings
2. Check browser permissions
3. Try different audio input device

### Common Mac Issues:

#### "Failed to start recording"
**Solution:**
1. Grant screen recording permission
2. Grant microphone permission
3. Restart browser after permissions
4. Check System Preferences

#### Permission denied errors
**Solution:**
1. Go to System Preferences > Security & Privacy
2. Add Chrome/Edge to Screen Recording
3. Add Chrome/Edge to Microphone
4. Restart browser

### General Issues:

#### Recording not starting
**Solution:**
1. Check browser console for errors
2. Ensure HTTPS or localhost
3. Try different browser (Chrome/Edge)
4. Clear browser cache

#### Upload fails
**Solution:**
1. Check internet connection
2. Verify API endpoint is accessible
3. Check authentication token
4. Try smaller recording first

## Browser Compatibility

### Supported Browsers:
- ✅ Chrome (recommended)
- ✅ Edge
- ⚠️ Firefox (limited support)
- ❌ Safari (not supported)

### Minimum Requirements:
- Chrome/Edge version 72+
- HTTPS or localhost
- Audio/video permissions granted

## Performance Tips

### For Better Quality:
1. **Close unnecessary applications**
2. **Use wired internet connection**
3. **Ensure sufficient disk space**
4. **Close other browser tabs**

### For Smaller File Sizes:
1. **Lower recording duration**
2. **Use screen audio only** (disable microphone)
3. **Close other applications**
4. **Use lower resolution if possible**

## Debug Information

### Console Logs to Check:
```javascript
// Look for these messages in browser console:
"Starting recording process..."
"Screen capture obtained:"
"Microphone access granted"
"MediaRecorder started successfully"
"Recording completed:"
```

### Common Error Messages:
- `NotAllowedError`: Permission denied
- `NotSupportedError`: Browser doesn't support feature
- `NotFoundError`: Audio/video device not found
- `NotReadableError`: Device in use by another application

## Extension Installation

### Development Mode:
1. Open Chrome/Edge
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select your extension folder

### Testing:
1. Open `test-recording.html`
2. Run compatibility tests
3. Test permissions
4. Try screen recording
5. Check console for errors

## API Integration

### Upload Endpoint:
```
POST https://class-capsule-2.onrender.com/recordings/upload
```

### Required Headers:
```
Authorization: Bearer <your-auth-token>
Content-Type: multipart/form-data
```

### File Format:
- Format: WebM video
- Codec: VP8/VP9 + Opus
- Quality: 2.5 Mbps video, 128 kbps audio

## Support

If you continue to experience issues:

1. **Check browser console** for detailed error messages
2. **Use the test page** to isolate issues
3. **Try different browsers** (Chrome/Edge)
4. **Check system permissions** (especially on Mac)
5. **Update browser** to latest version
6. **Clear browser cache** and cookies

## Version History

### v1.1 (Current)
- ✅ Fixed Windows audio source issues
- ✅ Fixed Mac recording failures
- ✅ Added platform-specific error messages
- ✅ Improved audio mixing with fallbacks
- ✅ Enhanced codec support
- ✅ Better resource cleanup
- ✅ Added comprehensive testing tools

### v1.0 (Previous)
- Basic screen recording functionality
- Simple audio mixing
- Limited error handling
- Platform-specific issues 