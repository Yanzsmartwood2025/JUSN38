from quart import Quart, request, jsonify, make_response
from quart_cors import cors
import asyncio
from opentts_client import OpenTTS

# --- MICRÓFONO 1: Confirmar que la cocina se ha encendido ---
print("app.py: El script de la cocina ha comenzado a ejecutarse.")

app = Quart(__name__)
app = cors(app, allow_origin="*")

# --- MICRÓFONO 2: Confirmar la inicialización del repartidor de voces ---
print("app.py: Inicializando el cliente de OpenTTS (el repartidor)...")
try:
    tts = OpenTTS("localhost", 5500, False)
    print("app.py: ¡Repartidor inicializado con éxito!")
except Exception as e:
    print(f"app.py: ERROR CRÍTICO al inicializar el repartidor: {e}")
    tts = None

@app.route("/api/tts", methods=["GET", "POST"])
async def handle_api_request():
    
    # --- MICRÓFONO 3: Confirmar que ha entrado una llamada a la cocina ---
    print(f"app.py: ¡Llamada recibida en la cocina! Método: {request.method}")

    if not tts:
        print("app.py: ERROR: La llamada no puede ser atendida, el repartidor no se inicializó.")
        return jsonify({"error": "El servicio de voces interno no está disponible."}), 503

    if request.method == "GET":
        print("app.py: La llamada es para pedir la lista de voces.")
        try:
            voices_dict = tts.voices(True)
            print("app.py: Lista de voces obtenida, enviando al local...")
            return jsonify(voices_dict)
        except Exception as e:
            print(f"app.py: ERROR al obtener la lista de voces del repartidor: {e}")
            return jsonify({"error": "No se pudo obtener la lista de voces."}), 500
            
    elif request.method == "POST":
        print("app.py: La llamada es para cocinar un audio.")
        try:
            data = await request.get_json()
            if not data or 'text' not in data or 'voice' not in data:
                print("app.py: ERROR: La orden está incompleta.")
                return jsonify({"error": "Faltan los parámetros 'text' o 'voice'"}), 400

            text = data['text']
            voice = data['voice']
            print(f"app.py: Cocinando audio para el texto: '{text}' con la voz: '{voice}'")
            
            wav_bytes = await asyncio.to_thread(tts.tts, text, voice)
            
            print("app.py: ¡Audio cocinado! Enviando el archivo .wav...")
            response = await make_response(wav_bytes)
            response.headers['Content-Type'] = 'audio/wav'
            return response
        except Exception as e:
            print(f"app.py: ERROR CRÍTICO durante la cocción del audio: {e}")
            return jsonify({"error": "No se pudo generar el audio."}), 500

# Añadimos una ruta de 'salud' para verificar que la app está viva
@app.route("/")
def health_check():
    print("app.py: Recibida una comprobación de salud. ¡La cocina está abierta!")
    return "<h1>JUSN38TTS Backend is running!</h1>"


### **Paso 3: La Prueba Final**

1.  **Guarda los cambios** en GitHub. Vercel comenzará un nuevo despliegue.
2.  Espera a que termine el despliegue.
3.  **Abre dos pestañas en tu navegador:**
    * En la **Pestaña 1**, ve a la página de tu aplicación (`...vercel.app`).
    * En la **Pestaña 2**, ve a los **"Runtime Logs"** de Vercel.
4.  **Abre las Herramientas de Desarrollador en la Pestaña 1:**
    * Haz clic derecho en la página y selecciona "Inspeccionar".
    * Ve a la pestaña **"Consola"**.
5.  **Recarga la Pestaña 1.**

Ahora observa los intercomunicadores:
* En la **Consola** de la Pestaña 1, verás los mensajes del "local".
* En los **Runtime Logs** de la Pestaña 2, verás los mensajes de la "cocina".

**Dime qué mensajes aparecen (y cuáles no) en ambos lados.** ¡Con esa información, encontraremos al culpable!
