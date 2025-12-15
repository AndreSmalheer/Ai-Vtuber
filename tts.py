import os
import json
import requests

def synthesise(data, url = "http://127.0.0.1:9880"):

    try:
        r = requests.get(url, timeout=2)
    except requests.exceptions.RequestException:
        return ["Gpt Sovits is not running"]

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
    streaming_mode =      data.get("streaming_mode", False)               # (optional) bool or int: return audio chunk by chunk the available options are: 0,1,2,3 or True/False (0/False: Disabled | 1/True: Best Quality, Slowest response speed (old version streaming_mode) | 2: Medium Quality, Slow response speed | 3: Lower Quality, Faster response speed )  
    fragment_interval =   float(data.get("fragment_interval", 0.3))       # (optional) float. to control the interval of the audio fragment.
    seed =                data.get("seed", -1)                            # (optional) int: random seed for reproducibility  
    parallel_infer =      data.get("parallel_infer", True)                # (optional) bool: whether to use parallel inference  
    repetition_penalty =  float(data.get("repetition_penalty", 1.35))     # (optional) float: repetition penalty for T2S model  
    sample_steps =        data.get("sample_steps", 32)                    # (optional) int: number of sampling steps for VITS model V3  
    super_sampling =      data.get("super_sampling", False)               # (optional) bool: whether to use super-sampling for audio when using VITS model V3  
    output_file =         data.get("output_file", "output.mp3")           # (optional) str: output file name
    
    script_dir = os.path.dirname(os.path.abspath(__file__))


    #  error handeling
    errors = []

    if not model:
        errors.append("No model specified")
    
    if not infer_text:
        errors.append("No infer_text specified")


    # get model data
    if(model != None):
     model_path      =   os.path.join("models", model)

     if os.path.exists(model_path):
        ref_audio_path = os.path.join(script_dir, "models", model, "ref_audio.ogg")
        ref_audio_path = ref_audio_path.replace("\\", "/")
        ref_json_path   =   os.path.join("models", model, "refrance.json")
        ref_audio_text =    json.load(open(ref_json_path, "r", encoding="utf-8")).get("ref_audio_text", None)
        ref_audio_lang =    json.load(open(ref_json_path, "r", encoding="utf-8")).get("ref_audio_lang", None)
     else:
         ref_audio_path = ref_audio_text = ref_audio_lang = None
         errors.append(f"Model {model} does not exist")   
 
     extra_refs_dir = os.path.join(script_dir, "models", model, "extra_refs")

     extra_refs = [
         os.path.join(extra_refs_dir, f).replace("\\", "/")
         for f in os.listdir(extra_refs_dir)
         if os.path.isfile(os.path.join(extra_refs_dir, f)) and any(f.endswith(ext) for ext in ['.mp3', '.wav', '.ogg', '.flac', '.m4a'])
     ] if os.path.exists(extra_refs_dir) else []

     
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
     (streaming_mode, bool, "streaming_mode must be a boolean"),
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
     if type(var) is not expected_type:
         errors.append(message)


    if errors:
     return errors, 400
    
    
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

    if not streaming_mode:
     try:
         response = requests.post(f"{url}/tts", json=payload, timeout=120)
         if response.status_code != 200:
             return f"TTS API responded, status code: {response.status_code}\nResponse: {response.text}", 400
     except requests.exceptions.Timeout:
          return "Error: Synthesis API request timed out", 504
     except requests.exceptions.RequestException as e:
         return f"Error: Synthesis API request failed: {e}", 502
     else:
         with open(output_file, "wb") as f:
             f.write(response.content)
         
         return [f"Audio successfully generated: {os.path.abspath(output_file)}"], 200
     
    try:
        with requests.post(f"{url}/tts", json=payload, timeout=120, stream=True) as r:
            r.raise_for_status()
            with open(output_file, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024):
                    if chunk:
                        f.write(chunk)
                        f.flush()
        return [f"Audio successfully generated in streaming mode: {os.path.abspath(output_file)}"], 200
    except requests.exceptions.RequestException as e:
        return [f"Error during streaming: {e}"], 502     
 
    

if __name__ == "__main__":
    data = {
       "model":  "Example",
        "infer_text": "This is a test inference sentence.",
        "streaming_mode": True,
    }

    result, code = synthesise(data)
    print(result, code)
