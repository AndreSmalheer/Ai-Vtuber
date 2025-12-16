from flask import Flask, render_template, request, Response, send_file, jsonify
import requests
import time
import json

from gtts import gTTS
import os
import uuid



app = Flask(__name__, static_folder='public')
ELECTRON_URL = "http://localhost:8123"
GPT_SOVITS_URL = "http://127.0.0.1:9880"


def validate_tts_request(data):
    try:
        r = requests.get(GPT_SOVITS_URL, timeout=2)
    except requests.exceptions.RequestException:
        return ["Gpt Sovits is not running"], 503

    if not isinstance(data, dict):
     return {"errors": ["Request body must be JSON"]}, 400

    model =               data.get("model", None)                         # (required) str: The model were using
    output_lan  =         data.get("output_lan", "en")                    # (optional) str: output language
    infer_text =          data.get("infer_text", None)                    # (required) str: language of the text to be synthesized  
           
    top_k =               data.get("top_k", 5)                            # (optional) int: top-k sampling  
    top_p =               float(data.get("top_p", 1))                     # (optional) float: top-p sampling  
    temperature =         float(data.get("temperature", 1))               # (optional) float: temperature for sampling  
           
    text_split_method =   data.get("text_split_method", "cut0")           # (optional) str: text split method (see text_segmentation_method.py for options)  
    batch_size =          data.get("batch_size", 1)                       # (optional) int: batch size for inference  
    batch_threshold =     float(data.get("batch_threshold", 0.75))        # (optional) float: threshold for batch splitting  
    split_bucket =        data.get("split_bucket", True)                  # (optional) bool: whether to split the batch into multiple buckets  
           
    speed_factor =        float(data.get("speed_factor", 1.0))            # (optional) float: control the speed of the synthesized audio  
    streaming_mode =      data.get("streaming_mode", False  )             # (optional) bool or int: return audio chunk by chunk the available options are: 0,1,2,3 or True/False (0/False: Disabled | 1/True: Best Quality, Slowest response speed (old version streaming_mode) | 2: Medium Quality, Slow response speed | 3: Lower Quality, Faster response speed )  
    fragment_interval =   float(data.get("fragment_interval", 0.3))       # (optional) float. to control the interval of the audio fragment.
    seed =                data.get("seed", -1)                            # (optional) int: random seed for reproducibility  
    parallel_infer =      data.get("parallel_infer", True)                # (optional) bool: whether to use parallel inference  
    repetition_penalty =  float(data.get("repetition_penalty", 1.35))     # (optional) float: repetition penalty for T2S model  
    sample_steps =        data.get("sample_steps", 32)                    # (optional) int: number of sampling steps for VITS model V3  
    super_sampling =      data.get("super_sampling", False)               # (optional) bool: whether to use super-sampling for audio when using VITS model V3  
    output_file =         data.get("output_file", "output.mp3")           # (optional) str: output file name


    script_dir = os.path.dirname(os.path.abspath(__file__))

    output_dir = os.path.dirname(os.path.abspath(output_file)) or "."
    if not os.path.exists(output_dir):
        errors.append(f"Directory for output_file does not exist: {output_dir}")

    #  error handeling
    errors = []

    if not model:
        errors.append("No model specified")
    
    if not infer_text:
        errors.append("No infer_text specified")



    # Normalize streaming_mode to int
    if isinstance(streaming_mode, bool):
        streaming_mode_int = 1 if streaming_mode else 0
    elif isinstance(streaming_mode, str) and streaming_mode in ["1","2","3"]:
        streaming_mode_int = int(streaming_mode)
    elif isinstance(streaming_mode, int) and streaming_mode in [0,1,2,3]:
        streaming_mode_int = streaming_mode
    else:
        errors.append("streaming_mode must be a boolean or one of 1,2,3")


    if not (1 <= top_k <= 100):
        errors.append("top_k must be between 1 and 100")
    if not (0.0 <= top_p <= 1.0):
        errors.append("top_p must be between 0.0 and 1.0")
    if temperature <= 0:
        errors.append("temperature must be > 0")
    if speed_factor <= 0:
        errors.append("speed_factor must be > 0")
    if streaming_mode_int > 0 and fragment_interval <= 0:
        errors.append("fragment_interval must be > 0 when streaming is enabled")
    if sample_steps <= 0:
        errors.append("sample_steps must be > 0")
    if repetition_penalty < 1.0:
        errors.append("repetition_penalty must be >= 1.0")
    
    

    
    # get model data
    if(model != None):
     model_path      =   os.path.join("models", model)

     if os.path.exists(model_path):
        ref_audio_path = os.path.join(script_dir, "models", model, "ref_audio.ogg").replace("\\", "/")
        ref_json_path = os.path.join(script_dir, "models", model, "refrance.json").replace("\\", "/")

        ref_audio_text = ref_audio_lang = None

        if not os.path.isfile(ref_json_path):
            errors.append(f"Reference JSON file does not exist: {ref_json_path}")
        else:
            try:
                ref_data = json.load(open(ref_json_path, "r", encoding="utf-8"))
                ref_audio_text, ref_audio_lang = ref_data.get("ref_audio_text"), ref_data.get("ref_audio_lang")
                if not ref_audio_text: errors.append(f"'ref_audio_text' missing in {ref_json_path}")
                if not ref_audio_lang: errors.append(f"'ref_audio_lang' missing in {ref_json_path}")
            except Exception as e:
                errors.append(f"Error reading {ref_json_path}: {e}")

     else:
         ref_audio_path = ref_audio_text = ref_audio_lang = None
         errors.append(f"Model {model} does not exist")   
 

    extra_refs_dir = os.path.join(script_dir, "models", model, "extra_refs")

    extra_refs = [
         os.path.join(extra_refs_dir, f).replace("\\", "/")
         for f in os.listdir(extra_refs_dir)
         if os.path.isfile(os.path.join(extra_refs_dir, f)) and any(f.endswith(ext) for ext in ['.mp3', '.wav', '.ogg', '.flac', '.m4a'])
    ] if os.path.exists(extra_refs_dir) else []  


    #  path erroes
    for ref in extra_refs:
     if not os.path.isfile(ref) or not os.access(ref, os.R_OK):
         errors.append(f"Extra reference file not readable: {ref}")

    type_checks = [
     (model, str, "model must be a string"),
     (infer_text, str, "infer_text must be a string"),   
     (top_k, int, "top_k must be an integer"),
     (top_p, float, "top_p must be a float"),
     (temperature, float, "temperature must be a float"),
     (text_split_method, str, "text_split_method must be a string"),
     (batch_size, int, "batch_size must be an integer"),
     (batch_threshold, float, "batch_threshold must be a float"),
     (split_bucket, bool, "split_bucket must be a boolean"),
     (speed_factor, float, "speed_factor must be a float"),
     (streaming_mode, (bool, int, str), "streaming_mode must be a boolean or 1,2,3"),
     (fragment_interval, float, "fragment_interval must be a float"),
     (seed, int, "seed must be an integer"),
     (parallel_infer, bool, "parallel_infer must be a boolean"),
     (repetition_penalty, float, "repetition_penalty must be a float"),
     (sample_steps, int, "sample_steps must be an integer"),
     (super_sampling, bool, "super_sampling must be a boolean"),
     (output_file, str, "output_file must be a string"),
     (output_lan, str, "output_lan must be a string"),
    ]

    for var, expected_type, message in type_checks:
     if (var is None or (isinstance(var, str) and var.strip() == "")) and message.startswith(("model", "infer_text")):
         continue
     if not isinstance(var, expected_type):
         errors.append(message)



    if errors:
     return {"errors": errors}, 400

    payload = {
        "text": infer_text or "",
        "text_lang": output_lan or "en",
        "ref_audio_path": ref_audio_path or "",
        "aux_ref_audio_paths": extra_refs or [],
        "prompt_text": ref_audio_text or "",
        "prompt_lang": ref_audio_lang or "en",
        "top_k": int(top_k),
        "top_p": float(top_p),
        "temperature": float(temperature),
        "text_split_method": text_split_method or "cut5",
        "batch_size": int(batch_size),
        "batch_threshold": float(batch_threshold),
        "split_bucket": bool(split_bucket),
        "speed_factor": float(speed_factor),
        "streaming_mode": int(streaming_mode),
        "seed": int(seed),
        "parallel_infer": bool(parallel_infer),
        "repetition_penalty": float(repetition_penalty),
        "sample_steps": int(sample_steps),
        "super_sampling": bool(super_sampling)
    } 


    return payload, 200

@app.route("/tts", methods=["POST"])
def tts():
    data = request.get_json()

    payload, status = validate_tts_request(data)

    if status != 200:
        return jsonify(payload), status

    
    # call tts
    streaming_mode =  payload.get("streaming_mode")

    if streaming_mode:
        return jsonify("streaming mode not supported"), 400
    
    try:
        r = requests.post(f"{GPT_SOVITS_URL}/tts", json=payload, timeout=120)
        r.raise_for_status()
        
        filename = f"debug_output_{uuid.uuid4().hex}.wav"
        with open(filename, "wb") as f:
            f.write(r.content)
        
        return send_file(filename, mimetype="audio/mpeg")
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}, 502
    


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/overlay')
def overlay():
    return render_template('overlay.html')

@app.route("/say")
def say():
    text = request.args.get("text")
    if not text:
        return "Please provide ?text=...", 400


    filename = os.path.join(os.getcwd(),  "public/assets/tts",  f"tts_{uuid.uuid4().hex}.mp3")
    tts = gTTS(text=text, lang='en')
    tts.save(filename)

    return send_file(filename, mimetype="audio/mpeg")



def generate_fake_stream(prompt):
    time.sleep(3)

    fake_response = f"Rain tapped softly against the old café window. Clara stirred her coffee, watching the streets glisten under the dim streetlights. She hadn’t expected him to show up, yet there he was, dripping wet, smiling awkwardly. Memories of laughter and whispered secrets filled the tiny space between them. “I didn’t think you’d come,” she whispered. He shrugged, settling into the chair across from her. “Some things are worth the storm,” he said. Outside, the city slept, unaware of the reunion happening in its heart. For a moment, time paused, leaving only warmth, rain, and the promise of new beginnings."
    for char in fake_response:

        chunk = json.dumps({"text": char})  
        yield f"data: {chunk}\n\n"
        time.sleep(0.05)  

    yield f"data: {json.dumps({'finish_reason': 'stop'})}\n\n"

@app.route("/ollama_stream", methods=["POST"])
def ollama_stream():
    data = request.json
    prompt = data.get("prompt", "")
    return Response(generate_fake_stream(prompt), mimetype="text/event-stream")

@app.route("/show_overlay")
def show_overlay():
    try:
        requests.get(f"{ELECTRON_URL}/show")
    except:
        pass
    return "OK"

@app.route("/hide_overlay")
def hide_overlay():
    try:
        requests.get(f"{ELECTRON_URL}/hide")
    except:
        pass
    return "OK"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
