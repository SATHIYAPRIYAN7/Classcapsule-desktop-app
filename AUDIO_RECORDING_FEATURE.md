# Audio-Only Recording Feature

## Overview

The ClassCapsule Recorder extension now supports two recording modes:
1. **Video + Audio** (default) - Records both screen video and audio
2. **Audio Only** - Records only audio from the microphone

## Features

### Recording Mode Selection
- Users can choose between "Video + Audio" and "Audio Only" recording modes
- The selection is made via radio buttons in the popup interface
- The UI dynamically updates to show the selected mode

### Audio-Only Recording
- Captures audio directly from the user's microphone
- No screen capture required for audio-only mode
- Smaller file sizes compared to video recordings
- Faster upload times due to reduced data size

### Platform Support
- **Mac**: Optimized audio recording with simplified audio processing
- **Windows**: Standard audio recording with noise suppression and echo cancellation
- **Other platforms**: Compatible with Chrome/Edge browsers

## Technical Implementation

### UI Changes
- Added recording mode selector in `popup.html`
- Radio buttons for "Video + Audio" and "Audio Only" options
- Dynamic button text that changes based on selected mode
- Visual feedback showing current recording mode

### Content Script Changes (`content.js`)
- Added `recordingMode` parameter to `startRecording()` method
- New methods for audio-only recording:
  - `startAudioOnlyRecordingMac()` - Mac-specific audio recording
  - `startAudioOnlyRecordingStandard()` - Standard audio recording
- Added `getAudioOnlyMimeType()` for audio codec selection
- Updated error handling for audio-specific permissions

### Background Script Changes (`background.js`)
- Added support for `recordingMode` parameter in upload requests
- Sends recording type metadata to API for proper file handling

## Usage

### Selecting Recording Mode
1. Open the ClassCapsule Recorder extension popup
2. Choose your preferred recording mode:
   - **Video + Audio**: Records screen and audio (default)
   - **Audio Only**: Records only microphone audio
3. Click "Start Recording" to begin

### Audio-Only Recording Process
1. Select "Audio Only" mode
2. Click "Start Audio Recording"
3. Grant microphone permissions when prompted
4. Speak into your microphone
5. Click "Stop Recording" when finished
6. The audio file will be uploaded to the API

## File Formats

### Audio-Only Files
- **Format**: WebM audio with Opus codec (preferred)
- **Fallback**: MP4 audio, OGG audio
- **Bitrate**: 128 kbps
- **Sample Rate**: 44.1 kHz (standard) / 48 kHz (Mac)

### Video + Audio Files
- **Format**: WebM video with VP8/VP9 + Opus codec
- **Video Bitrate**: 2.5 Mbps
- **Audio Bitrate**: 128 kbps

## Error Handling

### Permission Errors
- **Audio Only**: Microphone permission denied
- **Video + Audio**: Screen recording permission denied

### Platform-Specific Messages
- **Mac**: Detailed instructions for System Preferences
- **Windows**: Audio driver and permission guidance
- **Generic**: Browser compatibility and permission guidance

## API Integration

### Upload Parameters
- `file`: The recorded audio/video file
- `recordingType`: Metadata indicating recording mode ("audio-only" or "video-audio")
- `filename`: Generated filename with timestamp

### File Naming
- Audio files: `lecture-YYYY-MM-DD-HH-MM-SS.webm`
- Video files: `lecture-YYYY-MM-DD-HH-MM-SS.webm`

## Testing

### Test File
Use `test-audio-recording.html` to verify functionality:
1. Open the test file in a browser
2. Test audio-only recording
3. Test video + audio recording
4. Verify file downloads and playback

### Browser Compatibility
- **Chrome**: Full support for both modes
- **Edge**: Full support for both modes
- **Firefox**: Limited support (may require fallback codecs)
- **Safari**: Limited support (audio-only may work)

## Benefits

### Audio-Only Mode Advantages
- **Reduced bandwidth**: Smaller file sizes
- **Faster uploads**: Less data to transfer
- **Privacy**: No screen capture required
- **Battery friendly**: Lower CPU usage
- **Storage efficient**: Smaller storage requirements

### Use Cases
- **Podcasts**: Voice-only content
- **Voice notes**: Quick audio recordings
- **Interviews**: Audio-only conversations
- **Lectures**: Audio-only presentations
- **Music recording**: Instrument or voice recording

## Troubleshooting

### Common Issues

#### Microphone Not Working
1. Check browser permissions
2. Ensure microphone is not muted
3. Try refreshing the page
4. Check system audio settings

#### Audio Quality Issues
1. Use a good quality microphone
2. Ensure quiet recording environment
3. Check audio drivers are up to date
4. Try different browsers if issues persist

#### Upload Failures
1. Check internet connection
2. Verify authentication token is valid
3. Try shorter recordings first
4. Check browser console for errors

### Debug Information
- Recording mode is logged in console
- File sizes and formats are displayed
- Error messages provide specific guidance
- Test file provides detailed feedback

## Future Enhancements

### Potential Improvements
- **Audio quality settings**: Adjustable bitrate and sample rate
- **Multiple audio sources**: Mix multiple microphones
- **Audio effects**: Noise reduction, echo cancellation
- **Real-time preview**: Audio level monitoring
- **Format selection**: Choose output format (MP3, WAV, etc.)

### API Enhancements
- **Audio transcription**: Automatic speech-to-text
- **Audio analysis**: Quality metrics and analysis
- **Compression options**: Different quality levels
- **Streaming upload**: Real-time upload during recording 