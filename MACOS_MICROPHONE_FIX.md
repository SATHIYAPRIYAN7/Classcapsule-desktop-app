# macOS Microphone Permission Fix Guide

## Problem Description
The ClassCapsule Recorder app is getting a "Screen recording failed: Could not start audio source" error on macOS. The app appears in Screen Recording permissions but not in Microphone permissions.

## Root Cause
On macOS, Electron apps need to be properly configured with entitlements and permissions to access the microphone. The app needs to be built with specific entitlements and the user needs to grant microphone permissions manually.

## Solution Steps

### 1. Rebuild the App with Proper Entitlements

The app has been updated with proper macOS entitlements. You need to rebuild it:

```bash
# Install dependencies (if not already done)
npm install

# Build for macOS with proper entitlements
npm run build:mac
```

### 2. Grant Microphone Permissions

After installing the rebuilt app:

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

### 3. Alternative: Grant Permissions via Terminal

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

Use the included test page to verify microphone access:

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

### 6. Common Issues and Solutions

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

#### Issue: App crashes when requesting microphone
**Solution**:
- Check the console logs for detailed error messages
- Ensure the app is built with the latest Electron version
- Verify all dependencies are properly installed

### 7. Technical Details

The app has been updated with:

1. **Proper Entitlements** (`entitlements.mac.plist`):
   - `com.apple.security.device.audio-input`
   - `com.apple.security.device.microphone`
   - `com.apple.security.device.camera`

2. **Enhanced Permission Handling** (`main.js`):
   - Explicit microphone permission requests
   - Better error handling and logging
   - macOS-specific permission setup

3. **Improved Error Messages** (`renderer.js`):
   - Specific error messages for macOS
   - Better debugging information
   - Graceful fallback handling

### 8. Verification

After following these steps, the app should:
- Appear in System Preferences > Security & Privacy > Privacy > Microphone
- Successfully request and receive microphone access
- Record both system audio and microphone audio
- Show proper error messages if permissions are denied

### 9. Support

If you're still experiencing issues:
1. Check the console logs for detailed error messages
2. Use the test page to isolate the problem
3. Verify the app bundle has proper entitlements
4. Try resetting permissions and starting fresh

## Files Modified

- `main.js` - Enhanced permission handling
- `renderer.js` - Better error messages and debugging
- `package.json` - Added macOS entitlements configuration
- `entitlements.mac.plist` - New entitlements file
- `test-microphone.html` - Debug test page 