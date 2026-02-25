# Universal Translator Video Meeting - Architecture Plan

## Overview
A real-time video conferencing application that provides live subtitles and translation for participants.

## Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons
- **Backend**: Express.js (for LiveKit token generation and API proxying)
- **Video/Audio**: LiveKit (WebRTC infrastructure)
- **Translation/AI**: Gemini AI (for real-time translation of transcriptions)
- **State Management**: Zustand (user preferences, language settings)

## Component Structure
- `App.tsx`: Main entry point, handles routing between Lobby and Room.
- `Lobby.tsx`: User enters name, room, and selects spoken/target languages.
- `VideoRoom.tsx`: LiveKit Room container.
- `ParticipantGrid.tsx`: Responsive grid of video feeds.
- `SubtitleOverlay.tsx`: Displays translated text over the active speaker's video.
- `ControlBar.tsx`: Mute/Unmute, Camera On/Off, Language settings.

## Data Flow (Translation Pipeline)
1. **Audio Capture**: Participant's microphone captures audio.
2. **Transcription**: 
   - Option A: Use LiveKit's built-in transcription (if available/configured).
   - Option B: Stream audio to a transcription service (Deepgram/Whisper).
   - *Selected for this MVP*: We will use LiveKit Data Packets to broadcast transcriptions. For translation, we'll send the transcribed text to Gemini.
3. **Translation**: The transcribed text is sent to Gemini AI with the target language context.
4. **Broadcast**: The translated text is sent as a LiveKit Data Packet to all participants in the room.
5. **Display**: Each client receives the data packet and renders the subtitle overlay for the specific participant.

## Environment Variables
- `LIVEKIT_API_KEY`: LiveKit project API key.
- `LIVEKIT_API_SECRET`: LiveKit project API secret.
- `LIVEKIT_URL`: LiveKit server URL (e.g., wss://...).
- `GEMINI_API_KEY`: For translation services.
