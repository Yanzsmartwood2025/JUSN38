from quart import Quart, request, jsonify, make_response
from quart_cors import cors
import asyncio
from opentts_client import OpenTTS

# Inicializamos la aplicación Quart (el servidor)
app = Quart(__name__)
# Permitimos que la página web (incluso si está en otro dominio) hable con esta cocina
app = cors(app, allow_origin="*")

# Creamos una instancia del cliente de OpenTTS. 
# La dirección "localhost" es interna para Vercel.
tts = OpenTTS("localhost", 5500, False)

@app.route("/api/tts", methods=["GET", "POST"])
async def handle_api_request():
    # Si la página pide la lista de voces (GET)
    if request.method == "GET":
        try:
            # Le pedimos al cliente de OpenTTS que nos dé el diccionario de voces
            voices_dict = tts.voices(True)
            return jsonify(voices_dict)
        except Exception as e:
            # Si algo sale mal, imprimimos el error en los logs de Vercel
            print(f"Error fetching voices: {e}")
            return jsonify({"error": "No se pudo conectar al servidor de voces interno."}), 500
            
    # Si la página nos envía texto para generar audio (POST)
    elif request.method == "POST":
        try:
            # Obtenemos los datos (texto y voz) que nos envió el JavaScript
            data = await request.get_json()
            if not data or 'text' not in data or 'voice' not in data:
                return jsonify({"error": "Faltan los parámetros 'text' o 'voice'"}), 400

            text = data['text']
            voice = data['voice']
            
            # Esta es la parte mágica: le pedimos al cliente que genere el audio.
            # asyncio.to_thread se asegura de que no se bloquee el servidor mientras se genera.
            wav_bytes = await asyncio.to_thread(tts.tts, text, voice)
            
            # Preparamos el audio para enviarlo de vuelta a la página web
            response = await make_response(wav_bytes)
            response.headers['Content-Type'] = 'audio/wav'
            return response
        except Exception as e:
            # Si algo sale mal, lo reportamos
            print(f"Error generating TTS: {e}")
            return jsonify({"error": "No se pudo generar el audio."}), 500

# Esta ruta es un seguro. Aunque vercel.json ya se encarga de esto, 
# nos aseguramos de que la ruta principal sirva el index.html.
@app.route("/")
async def serve_index():
    return await app.send_static_file('index.html')

