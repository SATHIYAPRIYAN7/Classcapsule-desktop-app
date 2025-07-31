# macOS Microphone Permission Fix Guide - Version 2.0

## Problem Description
The ClassCapsule Recorder app is getting a "Screen recording failed: Could not start audio source" error on macOS. The app appears in Screen Recording permissions but not in Microphone permissions, causing recording to fail.

## Root Cause
On macOS, Electron apps need to be properly configured with entitlements and permissions to access the microphone. The app needs to be built with specific entitlements and the user needs to grant microphone permissions manually.

## Solution Steps

### 1. Rebuild the App with Enhanced Entitlements

The app has been updated with improved macOS entitlements and enhanced microphone handling. You need to rebuild it:

```bash
# Install dependencies (if not already done)
npm install

# Build for macOS with proper entitlements
npm run build:mac
```

### 2. Enhanced Permission Handling

The app now includes:
- **Enhanced microphone access for macOS** with fallback mechanisms
- **Better error messages** with specific macOS instructions
- **Improved permission handling** in the main process
- **Comprehensive debugging tools** for troubleshooting

### 3. Grant Microphone Permissions

After installing the rebuilt app:

#### Method 1: System Preferences (Recommended)

1. **Open System Preferences**
   - Go to Apple Menu > System Preferences (or System Settings on newer macOS)

2. **Navigate to Security & Privacy**
   - Click on "Security & Privacy" (or "Privacy & Security" on newer macOS)

3. **Select Microphone**
   - Click on "Privacy" tab
   - Select "Microphone" from the left sidebar

4. **Add the App**
   - Click the lock icon to make changes (enter your password)
   - Click the "+" button to add an application
   - Navigate to your Applications folder
   - Select "ClassCapsule Recorder" and click "Open"
   - Make sure the checkbox next to "ClassCapsule Recorder" is checked

5. **Restart the App**
   - Close the ClassCapsule Recorder app completely
   - Reopen the app

#### Method 2: Terminal Commands (Advanced)

If the app doesn't appear in the Microphone list, you can grant permissions via terminal:

```bash
# Find the app bundle
find /Applications -name "ClassCapsule Recorder.app" -type d

# Grant microphone permission (replace with actual path)
sudo tccutil add Microphone /Applications/ClassCapsule\ Recorder.app

# Grant screen recording permission
sudo tccutil add ScreenCapture /Applications/ClassCapsule\ Recorder.app
```

### 4. Test Microphone Access

Use the included debug tools to verify microphone access:

#### Option A: Use the Enhanced Debug Page
1. Open `mac-microphone-debug.html` in the app
2. Click "Check System Status" to verify platform detection
3. Click "Check Microphone Permissions" to check current state
4. Click "Test Basic Microphone Access" to test basic functionality
5. Click "Test Advanced Microphone Access" to test with advanced settings
6. Click "Test Audio Recording" to verify recording works

#### Option B: Use the Original Test Page
1. Open `test-microphone.html` in the app
2. Click "Test Microphone Permission" to check current state
3. Click "Request Microphone Access" to test access
4. Click "Test Audio Recording" to verify recording works

### 5. Debug Information

If you're still having issues, check the following:

#### Check App Entitlements
```bash
# Check if the app has proper entitlements
codesign -d --entitlements :- "/Applications/ClassCapsule Recorder.app"
```

#### Check Permission Status
```bash
# Check microphone permission status
tccutil list Microphone

# Check screen recording permission status  
tccutil list ScreenCapture
```

#### Reset Permissions (if needed)
```bash
# Reset all microphone permissions (use with caution)
sudo tccutil reset Microphone

# Reset all screen recording permissions (use with caution)
sudo tccutil reset ScreenCapture
```

### 6. Enhanced Error Handling

The app now provides better error messages for macOS:

- **Specific macOS instructions** when microphone access is denied
- **Fallback mechanisms** for different microphone access scenarios
- **Detailed logging** for debugging permission issues
- **Platform-specific handling** for macOS vs other platforms

### 7. Technical Improvements

The app has been updated with:

1. **Enhanced Entitlements** (`entitlements.mac.plist`):
   - `com.apple.security.device.audio-input`
   - `com.apple.security.device.microphone`
   - `com.apple.security.device.camera`

2. **Improved Permission Handling** (`main.js`):
   - Enhanced microphone permission requests
   - Better error handling and logging
   - macOS-specific permission setup
   - Automatic permission granting for microphone access

3. **Enhanced Microphone Access** (`renderer.js`):
   - Platform-specific microphone access strategies
   - Fallback mechanisms for macOS
   - Better error messages with specific instructions
   - Improved audio quality settings

4. **Comprehensive Debug Tools** (`mac-microphone-debug.html`):
   - System status checking
   - Permission state verification
   - Device enumeration
   - Multiple testing approaches
   - Terminal command generation

### 8. Common Issues and Solutions

#### Issue: App doesn't appear in Microphone permissions
**Solution**: 
- Make sure you're using the latest built version with entitlements
- Try the terminal commands above to manually add permissions
- Check if the app is properly signed

#### Issue: Permission granted but still getting errors
**Solution**:
- Restart the app completely
- Check if there are multiple versions of the app installed
- Verify the app bundle has proper entitlements
- Use the debug tools to test microphone access

#### Issue: App crashes when requesting microphone
**Solution**:
- Check the console logs for detailed error messages
- Ensure the app is built with the latest Electron version
- Verify all dependencies are properly installed
- Try the basic microphone access test first

#### Issue: "Could not start audio source" error
**Solution**:
- Grant microphone permissions in System Preferences
- Restart the app completely after granting permissions
- Use the debug tools to verify microphone access
- Check if microphone is being used by another application

### 9. Verification

After following these steps, the app should:
- Appear in System Preferences > Security & Privacy > Privacy > Microphone
- Successfully request and receive microphone access
- Record both system audio and microphone audio
- Show proper error messages if permissions are denied
- Provide detailed debugging information when issues occur

### 10. Support

If you're still experiencing issues:
1. Use the debug tools to isolate the problem
2. Check the console logs for detailed error messages
3. Verify the app bundle has proper entitlements
4. Try resetting permissions and starting fresh
5. Test with the basic microphone access first

## Files Modified

- `main.js` - Enhanced permission handling with macOS-specific logic
- `renderer.js` - Improved microphone access with fallback mechanisms
- `package.json` - Added new debug file to build configuration
- `entitlements.mac.plist` - Existing entitlements (no changes needed)
- `mac-microphone-debug.html` - New comprehensive debug tool
- `test-microphone.html` - Existing test page (no changes needed)

## Build Commands

```bash
# Development
npm start

# Build for macOS
npm run build:mac

# Build for all platforms
npm run build
```

## Testing Commands

After building, test the app with:

```bash
# Open the debug page in the built app
open "/Applications/ClassCapsule Recorder.app/Contents/Resources/app/mac-microphone-debug.html"

# Or open the test page
open "/Applications/ClassCapsule Recorder.app/Contents/Resources/app/test-microphone.html"
``` 