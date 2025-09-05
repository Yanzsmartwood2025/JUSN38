from quart import Quart, request, jsonify, make_response
from quart_cors import cors
import asyncio
from opentts_client import OpenTTS
import logging

# Configuración del logging para ver más detalles en Vercel
logging.basicConfig(level=logging.INFO)

# --- MENSAJE DE ARRANQUE ---
logging.info("api/index.py: El script de la cocina ha comenzado a ejecutarse.")

app = Quart(__name__)
app = cors(app, allow_origin="*")

# Variable global para el cliente TTS
tts_client = None

# --- FUNCIÓN DE ARRANQUE AUTOMÁTICO ---
async def startup_event():
    global tts_client
    try:
        logging.info("Intentando inicializar el cliente OpenTTS...")
        # Usamos un host local porque el servidor corre en el mismo contenedor
        tts_client = OpenTTS("localhost", 5500, False)
        # Hacemos una llamada de prueba para "calentar" el motor
        logging.info("Calentando el motor de voces (esto puede tardar)...")
        _ = tts_client.voices(True) # Llamada de prueba
        logging.info("¡Cliente OpenTTS inicializado y listo!")
    except Exception as e:
        logging.error(f"Error CRÍTICO durante el arranque: {e}")
        tts_client = None

# Vercel ejecutará esto al iniciar la aplicación
@app.before_serving
async def startup():
    await startup_event()

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>", methods=["GET", "POST"])
async def handle_api_request(path):
    global tts_client
    if tts_client is None:
        logging.error("El cliente TTS no está disponible. La cocina no pudo arrancar.")
        return jsonify({"error": "El motor de voces no pudo arrancar. Revisa los logs de Vercel."}), 503

    if request.method == "GET":
        try:
            logging.info("Recibida solicitud GET para obtener voces.")
            voices_dict = tts_client.voices(True)
            logging.info(f"Enviando {len(voices_dict.get('voices', []))} voces al cliente.")
            return jsonify(voices_dict)
        except Exception as e:
            logging.error(f"Error al obtener las voces: {e}")
            return jsonify({"error": "No se pudo obtener la lista de voces."}), 500
            
    elif request.method == "POST":
        try:
            logging.info("Recibida solicitud POST para generar audio.")
            data = await request.get_json()
            text = data['text']
            voice = data['voice']
            
            logging.info(f"Generando audio para el texto: '{text[:30]}...' con la voz: {voice}")
            wav_bytes = await asyncio.to_thread(tts_client.tts, text, voice)
            
            response = await make_response(wav_bytes)
            response.headers['Content-Type'] = 'audio/wav'
            logging.info("Audio generado y enviado con éxito.")
            return response
        except Exception as e:
            logging.error(f"Error al generar el audio: {e}")
            return jsonify({"error": "No se pudo generar el audio."}), 500

    return jsonify({"error": "Ruta no encontrada"}), 404
