# Project Mia

This is Mia, an AI companion.

![Mia](./server/frontend/public/favicon.png)

Built using Three.js with a VRM character model.

The VRM file was created using VRoid Studio.

## Features

- Text-to-speech with Piper
- Ollama LLM integration
- Dark / Light mode
- Stealth mode (hides the VRM character and shows only the chat)
- Orbit controls for the VRM character
- Configurable post-processing effects
- Configurable response delay speed
- Configurable “welcome back” message
- Subscribable push notifications
- Automatic notification between 10 and 60 mn after exseting the site

## Requirments
- Node.js
- Python 3.10.11
- Ollama server
- Piper tts server

## How to install

### 1. Clone the repository

```bash
git clone https://github.com/AndreSmalheer/Project-Mia
```

### 2. Navigate into the project folder

```bash
cd Project-Mia/server
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```
