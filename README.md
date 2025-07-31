# ClassCapsule Recorder v2.0

A desktop screen recording application built with Electron for ClassCapsule.

## Features

- **Screen Recording**: Record your screen with system audio and microphone
- **Authentication**: Login with email/password or use JWT token
- **Smart Upload**: Automatic file size detection with multipart upload for large files
- **Audio Controls**: Toggle system audio and microphone recording
- **Local Fallback**: Automatically saves recordings locally if upload fails
- **High Quality**: HD video (720p-1080p) with stereo audio for professional recordings

## Compression Settings

The application uses high-quality settings for optimal video and audio quality:

### Video Settings
- **Resolution**: 1280x720 (HD) with support up to 1920x1080 (Full HD)
- **Frame Rate**: 24-30 FPS for smooth video playback
- **Bitrate**: 1 Mbps for high quality video

### Audio Settings
- **System Audio**: 64 kbps for clear audio
- **Microphone**: 48 kHz sample rate with stereo channels
- **Channels**: Stereo (2 channels) for better audio quality

### Recording Settings
- **Chunk Collection**: Every 250ms for better real-time recording
- **Codec**: VP8 video + Opus audio (WebM format)

## Upload Logic

The application now supports two upload methods based on file size:

### Small Files (< 10MB)
- Uses traditional single-request upload
- Faster for small recordings
- Direct upload to server

### Large Files (≥ 10MB)
- Uses multipart upload to S3
- Breaks large files into chunks
- Uploads chunks in parallel with retry logic
- Shows real-time progress
- Handles network interruptions gracefully

## Multipart Upload Process

1. **Start Upload**: Initiates multipart upload session
2. **Generate URLs**: Gets presigned URLs for each chunk
3. **Upload Parts**: Uploads chunks with retry logic (3 attempts)
4. **Complete Upload**: Finalizes the multipart upload

## Installation

```bash
npm install
npm start
```

## Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## API Endpoints

The application communicates with the following endpoints:

- `POST /auth/login` - User authentication
- `POST /recordings/upload` - Single file upload
- `POST /recordings/start-multipart-upload` - Start multipart upload
- `POST /recordings/generate-presigned-url` - Generate presigned URLs
- `POST /recordings/complete-multipart-upload` - Complete multipart upload

## Error Handling

- Automatic retry for failed upload parts
- Local fallback if upload fails
- Progress indicators for large uploads
- Graceful error messages

## Development

The application uses:
- **Electron** for desktop functionality
- **MediaRecorder API** for screen capture
- **WebRTC** for audio/video streams
- **Node.js HTTP/HTTPS** for server communication

## License

MIT License - see LICENSE file for details. 