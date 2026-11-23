import json
import urllib.request
import urllib.error

URL_WEBHOOK = "http://127.0.0.1:8000/api/webhooks/leads"

payload = {
    "empresa": "Instituto Educacional Horizonte",
    "nome_completo": "Mariana Costa",
    "whatsapp": "22998877665",
    "email": "mariana@horizonte.edu.br",
    "solucao_interesse": "Automação de Atendimento e Captação",
    "descricao": (
        "Recebemos cerca de 150 mensagens por dia no WhatsApp sobre matrículas "
        "e nossa equipe demora horas para responder. Queremos automatizar a "
        "triagem e o agendamento de visitas ainda este mês."
    )
}

dados_bytes = json.dumps(payload).encode("utf-8")

req = urllib.request.Request(
    URL_WEBHOOK,
    data=dados_bytes,
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    with urllib.request.urlopen(req) as resposta:
        corpo = resposta.read().decode("utf-8")
        print(f"Status: {resposta.status}")
        print("Resposta do servidor:", corpo)
except urllib.error.HTTPError as e:
    print(f"Erro HTTP {e.code}:", e.read().decode("utf-8"))
except urllib.error.URLError as e:
    print(f"Não foi possível conectar ao servidor: {e.reason}")