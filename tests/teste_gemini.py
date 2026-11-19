import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

chave = os.getenv("GEMINI_API_KEY")

if not chave:
    raise ValueError("Chave do Gemini não encontrada.")

cliente = genai.Client(api_key=chave)

resposta = cliente.models.generate_content(model="gemini-3.5-flash-lite", contents=(
        "Classifique como Alta, Média ou Baixa a prioridade "
        "deste lead e explique brevemente: "
        "Uma empresa precisa automatizar seu atendimento "
        "comercial para diminuir a demora nas respostas."))

print (resposta.text)