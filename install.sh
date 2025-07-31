#!/bin/bash

echo "========================================"
echo "ClassCapsule Recorder - Desktop App"
echo "========================================"
echo

echo "Checking if Node.js is installed..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    echo
    read -p "Press Enter to continue..."
    exit 1
fi

echo "Node.js found! Installing dependencies..."
echo

npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    echo "Please check your internet connection and try again."
    echo
    read -p "Press Enter to continue..."
    exit 1
fi

echo
echo "Dependencies installed successfully!"
echo
echo "Starting ClassCapsule Recorder..."
echo

npm start 