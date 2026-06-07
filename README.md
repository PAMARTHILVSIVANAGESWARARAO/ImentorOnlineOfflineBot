# I Mentor Online and Offline Bot

I Mentor Online and Offline Bot is a React Native Expo chat application with an Express and MongoDB backend. The app supports online AI chat through Groq, conversation history, streamed assistant responses, network-aware offline fallback messaging, and an onboarding flow for the offline model readiness flag.

The current app is built on Expo SDK 54, React Native 0.81, React 19, Expo Router, NativeWind, Zustand, MongoDB, and an Express TypeScript server.

## Current Status

This project currently includes:

- Expo Router app structure with onboarding and bottom tabs.
- Chat tab for live conversations.
- History tab for saved conversations.
- Conversation list with create, select, and delete support.
- Streaming AI responses from the backend using Server-Sent Events style chunks.
- MongoDB persistence for conversations and messages.
- Groq API integration using the `llama-3.3-70b-versatile` model.
- Network monitoring through `@react-native-community/netinfo`.
- Offline fallback behavior when the device is not connected.
- Persisted `offlineModelReady` and `onboardingCompleted` flags using Zustand and AsyncStorage.
- Onboarding screen that simulates a one-time offline model download.
- History tab download button that is enabled when the offline model is not ready and disabled when it is ready.

## App Flow

1. The app starts at `app/index.tsx`.
2. If onboarding is not completed, the user is sent to `app/onboarding.tsx`.
3. Onboarding lets the user either simulate downloading an offline model or skip it.
4. After onboarding, the app opens the tab layout in `app/(tabs)/`.
5. The Chat tab shows the active chat screen.
6. The History tab shows saved conversations and the offline model button.

## Features

### Onboarding

The onboarding screen explains the offline AI option and manages the initial offline model choice.

- File: `screens/OnboardingScreen.tsx`
- Download path: simulates progress, extraction, verification, and setup.
- Skip path: marks onboarding complete and keeps `offlineModelReady` as `false`.
- Successful simulated download sets `offlineModelReady` to `true`.

### Chat

The chat screen provides the main conversation interface.

- File: `screens/ChatScreen.tsx`
- Uses `ChatHeader`, `ChatBubble`, `ChatInput`, and `TypingIndicator`.
- Automatically scrolls as messages and stream text arrive.
- Disables input while streaming or thinking.

### Streaming Responses

Online chat uses `expo/fetch` so React Native can read streamed response bodies.

- File: `services/stream.service.ts`
- Adds the user message immediately to the UI.
- Sends the message to the backend stream endpoint.
- Reads streamed chunks and updates `streamingText`.
- Adds the completed assistant message after the stream ends.
- Refreshes conversations so generated titles and updated timestamps show in history.

### History

The history tab shows all conversations from the backend.

- Route: `app/(tabs)/history.tsx`
- Screen: `screens/ConversationScreen.tsx`
- List component: `components/ConversationList.tsx`
- Supports selecting a conversation, creating a new chat, and deleting a conversation.
- Includes a `Download Model` button:
  - Enabled when `offlineModelReady` is `false`.
  - Disabled and shown as `Model Ready` when `offlineModelReady` is `true`.
  - Functionality is intentionally left for later implementation.

### Offline Behavior

Offline mode currently uses a simple local fallback rather than a real local model.

- File: `hooks/useChat.ts`
- If `isConnected` is `false`, the app does not call the backend.
- The user message is added locally.
- The assistant reply depends on `offlineModelReady`:
  - `true`: `Offline model is ready to use.`
  - `false`: `Network error. No offline model available.`

### Network Monitoring

Network status is monitored globally.

- Files:
  - `services/network.service.ts`
  - `hooks/useNetwork.ts`
  - `components/NetworkIndicator.tsx`
- The Zustand store keeps `isConnected`.
- The UI can show online/offline state through the network indicator.

## Frontend Structure

```text
app/
  _layout.tsx              Root layout
  index.tsx                Initial redirect logic
  onboarding.tsx           Onboarding route
  (tabs)/
    _layout.tsx            Chat and History tab layout
    index.tsx              Chat tab route
    history.tsx            History tab route

screens/
  ChatScreen.tsx           Main chat UI
  ConversationScreen.tsx   History tab UI
  OnboardingScreen.tsx     Offline model onboarding UI

components/
  ChatBubble.tsx           Message bubble
  ChatHeader.tsx           Header for chat
  ChatInput.tsx            Message input
  ConversationList.tsx     Conversation history list
  NetworkIndicator.tsx     Online/offline status
  TypingIndicator.tsx      Assistant thinking indicator

hooks/
  useChat.ts               Main chat actions and state bridge
  useNetwork.ts            Network state hook

services/
  api.service.ts           REST API helpers
  stream.service.ts        Streaming chat client
  network.service.ts       NetInfo setup

store/
  chat.store.ts            Zustand store with persisted flags

types/
  chat.types.ts            Shared frontend chat types
```

## Backend Structure

```text
server/
  package.json
  tsconfig.json
  src/
    server.ts              Express, MongoDB, CORS, routes, health check
    routes/
      chat.routes.ts       Conversations, messages, stream endpoint
    models/
      Conversation.ts      Conversation schema
      Message.ts           Message schema
```

The backend runs on `BACKEND_PORT` or port `5000` by default.

## API Endpoints

Base URL in development:

```text
http://localhost:5000/api
```

Available routes:

```text
GET    /api/conversations
POST   /api/conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
DELETE /api/conversations/:id
POST   /api/conversations/:id/stream
```

Health check:

```text
GET /
```

## Environment Variables

Create a local `.env` file in the project root. It is intentionally ignored by git.

```env
GROQ_API=your_groq_api_key
BACKEND_PORT=5000
MONGO_URI=mongodb://localhost:27017/imdb
```

The backend accepts either `GROQ_API_KEY` or `GROQ_API`.

## Setup

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd server
npm install
cd ..
```

Make sure MongoDB is running locally or update `MONGO_URI` to point to your MongoDB instance.

## Running The Project

Start the backend:

```bash
cd server
npm run dev
```

Start the Expo app in another terminal:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

For a real Android device, map the device port back to your local backend:

```bash
adb reverse tcp:5000 tcp:5000
```

The frontend currently points to:

```text
http://localhost:5000/api
```

For Android emulators or physical devices, adjust `services/api.service.ts` if your environment needs a different host.

## Development Scripts

Frontend:

```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
```

Backend:

```bash
cd server
npm run dev
npm run start
npm run build
```

## State Management

The app uses Zustand in `store/chat.store.ts`.

State includes:

- `conversations`
- `activeConversation`
- `messages`
- `isConnected`
- `offlineModelReady`
- `onboardingCompleted`
- `isStreaming`
- `isThinking`
- `streamingText`

Only these flags are persisted:

- `offlineModelReady`
- `onboardingCompleted`

## Data Models

Conversation:

```ts
{
  _id: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
```

Message:

```ts
{
  _id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | Date;
}
```

## Completed Development Work

- Created the Expo Router app shell.
- Added onboarding before main app access.
- Added persisted onboarding completion state.
- Added persisted offline model readiness state.
- Built chat UI with message bubbles, typing indicator, input, and header.
- Built backend conversation and message APIs.
- Added MongoDB conversation and message storage.
- Added Groq streaming endpoint.
- Added frontend streaming client using `expo/fetch`.
- Added conversation history tab.
- Added create, select, and delete conversation actions.
- Added network status tracking.
- Added offline fallback response behavior.
- Added disabled/enabled history tab button for future offline model download functionality.

## Known Current Limitations

- The offline model download is currently simulated in onboarding.
- The History tab `Download Model` button does not yet download files.
- Offline assistant responses are placeholder messages.
- API base URL is hardcoded for local development.
- No automated tests are currently included.

## Useful Notes

- This project targets Expo SDK 54.
- Expo SDK 54 maps to React Native 0.81 and React 19.
- The backend streams Groq chunks to the frontend and also reconstructs the assistant response for MongoDB persistence.
- Conversation titles are generated from the first user message when the conversation title is still `New Conversation`.
- Deleting a conversation also deletes all messages for that conversation.


 npx expo install expo-dev-client
npx expo prebuild
 npx expo run:android
 npx expo start --dev-client