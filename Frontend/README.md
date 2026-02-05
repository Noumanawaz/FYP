# Voice Chatbot with FastAPI Backend

This project implements a voice chatbot feature that allows users to interact with a FastAPI backend using voice commands. The frontend captures voice input and sends it to the backend for processing.

## Features

- **Voice Recognition**: Real-time speech-to-text using browser's Web Speech API
- **Chat Interface**: Text and voice-based conversation with the chatbot
- **FastAPI Backend**: RESTful API for processing voice and text messages
- **Real-time Communication**: Live voice data transmission to backend
- **Conversation History**: Maintains chat history for context
- **Connection Status**: Shows connection status to backend
- **Settings Panel**: Configurable API endpoint

## Project Structure

```
Frontend/
├── src/
│   ├── components/
│   │   └── Voice/
│   │       ├── VoiceOrderModal.tsx (existing)
│   │       └── VoiceChatbotModal.tsx (new)
│   ├── services/
│   │   └── chatbotService.ts (new)
│   └── hooks/
│       └── useSpeechRecognition.ts (existing)
└── backend/
    ├── main.py (new)
    └── requirements.txt (new)
```

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd Frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI server:
   ```bash
   python main.py
   ```

The backend will be available at `http://localhost:8000`

## Usage

### Voice Chatbot

1. Click the **Message Square** icon in the header to open the voice chatbot
2. The chatbot will automatically test the connection to the backend
3. You can:
   - **Type messages** in the text input
   - **Use voice commands** by clicking the microphone button
   - **Send voice recordings** by recording audio and sending it to the backend
4. The chatbot will respond with helpful suggestions and maintain conversation context

### Voice Order (Existing Feature)

1. Click the **Microphone** icon in the search bar to open the voice order modal
2. Speak your food order clearly
3. The system will process your order and show a confirmation

## API Endpoints

### Backend Endpoints

- `GET /health` - Health check endpoint
- `POST /chat` - Handle text-based chat messages
- `POST /voice-chat` - Handle voice chat messages (audio file upload)

### Request/Response Format

**Text Chat:**

```json
POST /chat
{
  "message": "Hello, I want to order pizza",
  "conversation_history": [...]
}

Response:
{
  "response": "I can help you find pizza restaurants!",
  "confidence": 0.8,
  "suggestions": ["Show me the menu", "What are the prices?"]
}
```

**Voice Chat:**

```json
POST /voice-chat
Content-Type: multipart/form-data
audio: [audio file]

Response:
{
  "response": "I can help you find pizza restaurants!",
  "transcribed_message": "Hello, I want to order pizza",
  "confidence": 0.8,
  "suggestions": ["Show me the menu", "What are the prices?"]
}
```

## Configuration

### Frontend Configuration

The chatbot service can be configured in the settings panel:

- **API URL**: Change the backend endpoint (default: `http://localhost:8000`)
- **Connection Test**: Test the connection to the backend

### Backend Configuration

The backend can be customized by:

- Modifying the `generate_response()` function in `main.py`
- Adding more sophisticated AI models
- Integrating with external speech-to-text services
- Adding authentication and rate limiting

## Development

### Adding New Features

1. **Extend the chatbot logic** in `backend/main.py`
2. **Add new UI components** in `src/components/Voice/`
3. **Update the service layer** in `src/services/chatbotService.ts`

### Speech-to-Text Integration

For production use, replace the simulated transcription in `main.py` with:

- Google Speech-to-Text API
- Azure Speech Services
- Amazon Transcribe
- OpenAI Whisper

Example with Google Speech-to-Text:

```python
from google.cloud import speech

def transcribe_audio(audio_file):
    client = speech.SpeechClient()
    # Implementation here
    return transcribed_text
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure the backend CORS settings include your frontend URL
2. **Microphone Access**: Allow microphone permissions in your browser
3. **Connection Issues**: Check that the backend is running on the correct port
4. **Audio Recording**: Ensure your browser supports MediaRecorder API

### Browser Compatibility

- **Chrome**: Full support for all features
- **Firefox**: Full support for all features
- **Safari**: Limited support for Web Speech API
- **Edge**: Full support for all features

## Future Enhancements

- [ ] Real speech-to-text integration
- [ ] Text-to-speech for bot responses
- [ ] Multi-language support
- [ ] Voice command shortcuts
- [ ] Conversation analytics
- [ ] User authentication
- [ ] Rate limiting and security
- [ ] Mobile app integration

## License

This project is for educational purposes. Feel free to modify and extend it for your needs.
