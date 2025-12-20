# DockPilot Native App

A React Native mobile application for controlling your DockPilot server from Android and iOS devices.

## Features

- 🔌 **Server Connection**: Connect to your local DockPilot server via IP/URL
- 📱 **Mobile Control**: Trigger macros and shortcuts from your phone
- 🎨 **Modern UI**: Dark-themed interface inspired by Stream Deck
- 🔄 **Real-time Feedback**: Visual feedback for button triggers
- 💾 **Persistent Storage**: Remembers your server configuration
- 🌐 **Network Discovery**: Quick presets for common network configurations

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- A running DockPilot server on your local network

## Installation

1. Navigate to the native app directory:
```bash
cd app/native
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your platform:
   - iOS: Press `i` or run `npm run ios`
   - Android: Press `a` or run `npm run android`
   - Physical device: Scan the QR code with Expo Go app

## Server Configuration

### Finding Your Server IP

1. **On the same device** (localhost):
   - Use: `http://localhost:9001`

2. **On local network**:
   - Find your computer's local IP address:
     - **Windows**: Run `ipconfig` in Command Prompt, look for "IPv4 Address"
     - **Mac/Linux**: Run `ifconfig` or `ip addr`, look for your network interface
   - Use: `http://YOUR_IP:9001` (e.g., `http://192.168.1.100:9001`)

3. **Make sure**:
   - Your mobile device is on the same Wi-Fi network as your computer
   - Port 9001 is not blocked by firewall
   - The DockPilot server is running

### Connection Screen

When you first launch the app, you'll see the connection setup screen:

1. Enter your server's IP address or hostname
2. Use the quick preset buttons for common configurations
3. Tap "CONNECT TO SERVER" to test and connect
4. Once connected, you'll see your macro buttons

## Project Structure

```
src/
├── context/
│   └── ServerConnectionContext.tsx  # Server connection state management
├── screens/
│   ├── ConnectionSetupScreen.tsx    # Initial connection setup
│   └── MacroScreen.tsx              # Main macro button grid
├── types/
│   └── index.ts                     # TypeScript type definitions
└── utils/
    └── api.ts                       # API client for backend communication
```

## Troubleshooting

### Cannot Connect to Server

1. **Check server is running**:
   ```bash
   cd app/server
   uv run fastapi dev main.py
   ```

2. **Verify IP address**: Make sure you're using the correct local IP

3. **Network issues**:
   - Ensure both devices are on the same network
   - Check firewall settings
   - Try pinging the server from your mobile device

4. **Port conflicts**: Verify the server is running on port 9001

### Buttons Not Appearing

1. Create buttons using the web interface first (`http://localhost:3000`)
2. Pull down to refresh the button list in the app
3. Check that you have the correct profile selected

### Icons Not Loading

- Icons are served from the server's `/icons/` endpoint
- Make sure the server's icons folder contains the required images
- Check that the image URLs are accessible: `http://YOUR_IP:9001/icons/icon-name.png`

## Development

### Adding New Features

The app uses React Context for state management and a centralized API client:

```typescript
// Access server connection state
const { serverUrl, isConnected, checkConnection } = useServerConnection();

// Make API calls
import { apiClient } from './src/utils/api';
const profiles = await apiClient.getProfiles();
```

### Styling

The app uses React Native StyleSheet with a dark theme:
- Background: `#000000`
- Cards: `#171717`
- Borders: `#262626`
- Text: `#FFFFFF`, `#E5E5E5`, `#A3A3A3`
- Accent: Based on state (success, error, running)

## Building for Production

### iOS

```bash
expo build:ios
```

### Android

```bash
expo build:android
```

Refer to [Expo documentation](https://docs.expo.dev/build/setup/) for detailed build instructions.

## License

Same as the parent DockPilot project.

