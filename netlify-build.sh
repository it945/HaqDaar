#!/bin/bash

echo "--- Starting HaqDaar Build Process ---"

# Shallow clone Flutter to save time and bandwidth
if [ ! -d "flutter" ]; then
  echo "Cloning Flutter stable branch..."
  git clone https://github.com/flutter/flutter.git -b stable --depth 1
fi

export PATH="$PATH:$(pwd)/flutter/bin"

echo "Checking Flutter version..."
flutter --version

echo "Pre-downloading web artifacts..."
flutter precache --web

echo "Running pub get..."
flutter pub get

echo "Building Flutter Web (Release Mode)..."
# Using --no-tree-shake-icons as required by your Transaction model
flutter build web --release --no-tree-shake-icons

echo "Verifying build output..."
if [ -d "build/web" ]; then
  echo "Success: build/web directory created."
  ls -F build/web
else
  echo "Error: build/web directory NOT found!"
  exit 1
fi

echo "--- Build Process Complete ---"
