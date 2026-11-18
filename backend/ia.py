import os 
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel


class ResultadoIA(BaseModel):
    prioridade: Literal["Alta", "Média", "Baixa"]
    justificativa: str
    sugestao_abordagem: str


def classificar_lead(descricao: str, solucao_interesse: str) -> dict:
    load_dotenv()
    chave = os.getenv("GEMINI_API_KEY")

    if not chave:
        raise RuntimeError("Chave do Gemini não configurada.")


    cliente = genai.Client(api_key=chave)


    resposta = cliente.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=(
            "Você é um assistente de qualificação de leads comerciais. "
            "Analise as informações abaixo e sugira uma prioridade "
            "comercial, uma justificativa curta e uma abordagem inicial. "
            "Responda em português.\n\n"
            f"Descrição: {descricao}\n"
            f"Solução de interesse: {solucao_interesse}"
        ), config=types.GenerateContentConfig( response_mime_type="application/json", response_schema=ResultadoIA)
    )

    if resposta.parsed is None:
        raise ValueError("A IA não retornou uma resposta válida.")

    resultado = ResultadoIA.model_validate(resposta.parsed)
    return resultado.model_dump()