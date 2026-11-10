from pydantic import BaseModel, EmailStr

# Dados recebidos do Webhook do Site
class LeadWebhookSchema(BaseModel):
    nome_completo: str
    empresa: str
    email: EmailStr
    whatsapp: str
    descricao: str
    solucao_interesse: str