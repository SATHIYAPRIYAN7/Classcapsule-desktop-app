# Testing Multipart Upload Implementation

## Test Scenarios

### 1. Small File Upload (< 10MB)
- Record a short video (1-2 minutes)
- Verify it uses regular upload method
- Check console logs for "Using regular upload for small file"
- Verify successful upload

### 2. Large File Upload (≥ 10MB)
- Record a longer video (5+ minutes)
- Verify it uses multipart upload method
- Check console logs for "Using multipart upload for large file"
- Verify progress indicators show correctly
- Check that all parts upload successfully

### 3. Network Interruption Test
- Start a large file upload
- Temporarily disconnect internet
- Verify retry logic works (3 attempts per part)
- Reconnect and verify upload completes

### 4. Authentication Test
- Test with valid token
- Test with expired token
- Test with no token
- Verify appropriate error messages

## Console Logs to Check

### Successful Small File Upload
```
Using regular upload for small file
Upload successful: {data: {...}}
```

### Successful Large File Upload
```
Using multipart upload for large file
UploadId: abc123...
Presigned URLs count: 5
File size: 52428800, Chunk size: 10485760, Parts: 5
Part 1 uploaded successfully
Part 2 uploaded successfully
...
Multipart upload completed: {data: {...}}
```

### Error Handling
```
Error uploading part 2: Network error
Retrying part 2 (attempt 1/3)
Part 2 uploaded successfully
```

## API Endpoints to Monitor

1. `POST /recordings/start-multipart-upload`
2. `POST /recordings/generate-presigned-url`
3. `PUT` requests to S3 presigned URLs
4. `POST /recordings/complete-multipart-upload`

## Expected Behavior

- Files < 10MB: Single upload request
- Files ≥ 10MB: Multipart upload with progress
- Failed uploads: Local save fallback
- Network errors: Automatic retry with exponential backoff
- Progress indicators: Real-time status updates 