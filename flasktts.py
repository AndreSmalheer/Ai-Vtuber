from flask import Flask, request, Response, render_template_string, stream_with_context
import struct
import requests

app = Flask(__name__)
TTS_SERVER = "http://127.0.0.1:9880"

HTML_PAGE = """
<!DOCTYPE html>
<html>
<head><title>Streaming TTS Demo</title></head>
<body>
<h2>Streaming TTS Demo</h2>
<textarea id="ttsText" rows="3" cols="50">Hello, streaming test!</textarea><br><br>
<button onclick="startTTS()" id="speakBtn">Speak (Stream)</button>
<button onclick="saveToFile()">Save to File (Debug)</button>
<p id="status"></p>
<p id="bufferStatus" style="color: #666; font-size: 12px;"></p>

<script>
let audioContext = null;
let nextStartTime = 0;
let isPlaying = false;
let audioBuffer = [];
let isBuffering = true;
let bufferThreshold = 462144; // 96KB initial buffer (3 seconds at 32kHz)
let minBufferChunks = 40; // Minimum 12 chunks before starting
let totalBuffered = 0;
let hasStartedPlaying = false;

async function saveToFile() {
    const text = document.getElementById("ttsText").value;
    const statusEl = document.getElementById("status");
    
    statusEl.textContent = "Saving...";
    
    try {
        const response = await fetch('/save_tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text: text})
        });
        
        const result = await response.json();
        statusEl.textContent = result.message || result.error;
    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
    }
}

async function startTTS() {
    if (isPlaying) return;
    
    const text = document.getElementById("ttsText").value;
    const statusEl = document.getElementById("status");
    const bufferStatusEl = document.getElementById("bufferStatus");
    const btn = document.getElementById("speakBtn");
    
    btn.disabled = true;
    isPlaying = true;
    isBuffering = true;
    hasStartedPlaying = false;
    audioBuffer = [];
    totalBuffered = 0;
    statusEl.textContent = "Connecting...";
    bufferStatusEl.textContent = "Buffering: 0% (waiting for more data...)";

    // Initialize AudioContext on user interaction
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    
    nextStartTime = audioContext.currentTime;

    try {
        const response = await fetch('/stream_tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text: text, model: "Example"})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        let receivedData = new Uint8Array(0);
        let headerParsed = false;
        let sampleRate = 32000;
        let channels = 1;
        let bitsPerSample = 16;
        let dataStartOffset = 0;

        statusEl.textContent = "Buffering...";

        // Start playback processor with adaptive buffer management
        const playbackInterval = setInterval(() => {
            // Check if we need to rebuffer
            if (hasStartedPlaying && audioBuffer.length < 3 && isPlaying && !done) {
                if (!isBuffering) {
                    console.log('Buffer running low, pausing to rebuffer...');
                    isBuffering = true;
                    statusEl.textContent = "Rebuffering...";
                }
            }
            
            // Play chunks if not buffering and buffer has data
            if (!isBuffering && audioBuffer.length > 0) {
                const chunk = audioBuffer.shift();
                playAudioChunk(chunk, sampleRate, channels);
                
                // Update buffer status
                bufferStatusEl.textContent = `Playing - Buffer: ${audioBuffer.length} chunks`;
            }
            
            if (!isPlaying && audioBuffer.length === 0) {
                clearInterval(playbackInterval);
            }
        }, 50); // Check every 50ms for smooth playback

        let done = false;

        while (true) {
            const {done: streamDone, value} = await reader.read();
            done = streamDone;
            
            if (value) {
                // Concatenate chunks
                const tmp = new Uint8Array(receivedData.length + value.length);
                tmp.set(receivedData);
                tmp.set(value, receivedData.length);
                receivedData = tmp;

                // Parse WAV header from first chunk
                if (!headerParsed && receivedData.length >= 44) {
                    const view = new DataView(receivedData.buffer);
                    
                    // Verify RIFF header
                    const riff = String.fromCharCode(...receivedData.slice(0, 4));
                    if (riff !== 'RIFF') {
                        console.error('Invalid WAV header');
                        break;
                    }
                    
                    const audioFormat = view.getUint16(20, true);
                    channels = view.getUint16(22, true);
                    sampleRate = view.getUint32(24, true);
                    bitsPerSample = view.getUint16(34, true);
                    dataStartOffset = 44;
                    headerParsed = true;
                    
                    console.log(`WAV format: ${sampleRate}Hz, ${channels} ch, ${bitsPerSample}-bit, format=${audioFormat}`);
                }

                // Process audio data after header
                if (headerParsed && receivedData.length > dataStartOffset) {
                    const audioData = receivedData.slice(dataStartOffset);
                    totalBuffered += value.length;
                    
                    // Update buffer status
                    if (isBuffering) {
                        const bufferPercent = Math.min(100, Math.floor((totalBuffered / bufferThreshold) * 100));
                        bufferStatusEl.textContent = `Buffering: ${bufferPercent}%`;
                    }
                    
                    // Process in chunks
                    const CHUNK_SIZE = 8192;
                    if (audioData.length >= CHUNK_SIZE) {
                        const chunkToBuffer = audioData.slice(0, CHUNK_SIZE);
                        audioBuffer.push(chunkToBuffer);
                        
                        // Start playback once buffer threshold is reached
                        if (isBuffering && totalBuffered >= bufferThreshold) {
                            isBuffering = false;
                            statusEl.textContent = "Playing...";
                            bufferStatusEl.textContent = `Buffer: ${audioBuffer.length} chunks`;
                            console.log('Buffer filled, starting playback');
                        }
                        
                        // Keep remaining data + header
                        receivedData = new Uint8Array(44 + (audioData.length - CHUNK_SIZE));
                        receivedData.set(receivedData.slice(0, 44));
                        receivedData.set(audioData.slice(CHUNK_SIZE), 44);
                        dataStartOffset = 44;
                    }
                    
                    // Update buffer status during playback
                    if (!isBuffering) {
                        bufferStatusEl.textContent = `Buffer: ${audioBuffer.length} chunks`;
                    }
                }
            }

            if (done) {
                // Add any remaining audio to buffer
                if (headerParsed && receivedData.length > dataStartOffset) {
                    const remaining = receivedData.slice(dataStartOffset);
                    if (remaining.length > 0) {
                        audioBuffer.push(remaining);
                    }
                }
                
                // If we never started playing (small audio or very slow), start now with whatever we have
                if (isBuffering && audioBuffer.length > 0) {
                    isBuffering = false;
                    hasStartedPlaying = true;
                    statusEl.textContent = "Playing...";
                    console.log(`Stream ended with ${audioBuffer.length} chunks, starting playback`);
                }
                
                break;
            }
        }

        statusEl.textContent = "Stream complete, finishing playback...";
        
        // Wait for buffer to empty
        const waitForBufferEmpty = setInterval(() => {
            if (audioBuffer.length === 0 && nextStartTime <= audioContext.currentTime) {
                clearInterval(waitForBufferEmpty);
                statusEl.textContent = "Complete!";
                bufferStatusEl.textContent = "";
                btn.disabled = false;
                isPlaying = false;
            }
        }, 100);
        
    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
        bufferStatusEl.textContent = "";
        console.error('Streaming error:', error);
        btn.disabled = false;
        isPlaying = false;
    }
}

function playAudioChunk(pcmData, sampleRate, channels) {
    // Convert Int16 PCM to Float32 using DataView for proper little-endian reading
    const samples = pcmData.length / 2;
    const float32Data = new Float32Array(samples);
    const view = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);
    
    for (let i = 0; i < samples; i++) {
        // Read as little-endian signed int16
        const int16 = view.getInt16(i * 2, true);
        float32Data[i] = int16 / 32768.0;
    }

    // Create audio buffer
    const audioBuffer = audioContext.createBuffer(channels, samples, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    // Schedule playback
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    // Schedule at next available time for seamless playback
    const startTime = Math.max(nextStartTime, audioContext.currentTime);
    source.start(startTime);
    
    // Update next start time
    nextStartTime = startTime + audioBuffer.duration;
}
</script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML_PAGE)

def make_wav_header(sample_rate=32000, bits_per_sample=16, channels=1):
    """
    Generate a streaming-compatible WAV header.
    Uses maximum file size (0xFFFFFFFF) for unknown length.
    """
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    
    # Use max values for streaming (length unknown)
    chunk_size = 0xFFFFFFFF - 8
    data_size = 0xFFFFFFFF - 44
    
    header = struct.pack('<4sI4s4sIHHIIHH4sI',
        b'RIFF',
        chunk_size,
        b'WAVE',
        b'fmt ',
        16,
        1,
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b'data',
        data_size
    )
    return header

@app.route("/stream_tts", methods=["POST"])
def stream_tts():
    data = request.get_json() or {}
    payload = {
        "text": data.get("text", "Hello"),
        "text_lang": "en",
        "ref_audio_path": "C:/Projects/Companion-AI/models/Example/ref_audio.ogg",
        "prompt_lang": "en",
        "prompt_text": "You've been all over, so you must've seen a lot. When you've got the time, tell me your story, yea?",
        "streaming_mode": True,
        "media_type": "wav"
    }

    try:
        r = requests.post(f"{TTS_SERVER}/tts", json=payload, stream=True, timeout=120)
        r.raise_for_status()

        def generate():
            first_chunk = True
            
            for chunk in r.iter_content(chunk_size=4096):
                if not chunk:
                    continue
                    
                if first_chunk:
                    if len(chunk) >= 44:
                        if chunk[:4] == b'RIFF':
                            yield chunk
                            first_chunk = False
                            continue
                    
                    # Create header with 32kHz default
                    sample_rate = 32000
                    header = make_wav_header(sample_rate=sample_rate, bits_per_sample=16, channels=1)
                    yield header
                    first_chunk = False
                
                yield chunk

        return Response(
            stream_with_context(generate()), 
            mimetype="audio/wav",
            headers={
                'Cache-Control': 'no-cache',
                'X-Content-Type-Options': 'nosniff'
            }
        )

    except requests.exceptions.RequestException as e:
        return {"error": str(e)}, 502


@app.route("/save_tts", methods=["POST"])
def save_tts():
    """Save TTS output to file for debugging"""
    data = request.get_json() or {}
    payload = {
        "text": data.get("text", "Hello"),
        "text_lang": "en",
        "ref_audio_path": "C:/Projects/Companion-AI/models/Example/ref_audio.ogg",
        "prompt_lang": "en",
        "prompt_text": "You've been all over, so you must've seen a lot. When you've got the time, tell me your story, yea?",
        "streaming_mode": False
    }

    try:
        r = requests.post(f"{TTS_SERVER}/tts", json=payload, timeout=120)
        r.raise_for_status()
        
        filename = "debug_output.wav"
        with open(filename, "wb") as f:
            f.write(r.content)
        
        return {"message": f"Saved to {filename}", "size": len(r.content)}, 200
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}, 502


if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)