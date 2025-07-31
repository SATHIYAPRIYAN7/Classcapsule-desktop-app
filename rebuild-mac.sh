#!/bin/bash

# ClassCapsule Recorder - macOS Rebuild Script
# This script rebuilds the app with enhanced microphone support for macOS

echo "=========================================="
echo "ClassCapsule Recorder - macOS Rebuild"
echo "=========================================="

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only."
    echo "Please run this script on a macOS system."
    exit 1
fi

echo "✅ macOS detected"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    echo "Please install npm or reinstall Node.js"
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found."
    echo "Please run this script from the ClassCapsule Recorder project directory."
    exit 1
fi

echo "✅ Project directory confirmed"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Build for macOS
echo ""
echo "🔨 Building for macOS..."
npm run build:mac

if [ $? -ne 0 ]; then
    echo "❌ Failed to build for macOS"
    exit 1
fi

echo "✅ Build completed successfully"

# Check if the app was built
if [ -d "dist/mac" ]; then
    echo ""
    echo "🎉 Build successful! The app is located in:"
    echo "   dist/mac/"
    echo ""
    echo "📋 Next steps:"
    echo "1. Install the app from the dist/mac/ directory"
    echo "2. Grant microphone permissions in System Preferences"
    echo "3. Test microphone access using the debug tools"
    echo ""
    echo "🔧 To test microphone access:"
    echo "   - Open the app"
    echo "   - Navigate to mac-microphone-debug.html"
    echo "   - Run the microphone tests"
    echo ""
    echo "📖 For detailed instructions, see:"
    echo "   MACOS_MICROPHONE_FIX_V2.md"
else
    echo "❌ Build completed but app not found in dist/mac/"
    echo "Please check the build output for errors."
    exit 1
fi

echo ""
echo "=========================================="
echo "Build process completed!"
echo "==========================================" 