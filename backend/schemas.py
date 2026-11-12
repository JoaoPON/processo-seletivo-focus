from pydantic import BaseModel, EmailStr
from typing import Optional

# Dados recebidos do Webhook do Site
class LeadWebhookSchema(BaseModel):
    nome_completo: str
    empresa: str
    email: EmailStr
    whatsapp: str
    descricao: str
    solucao_interesse: str


class LeadCreateSchema(BaseModel):
    empresa: str
    nome_completo: str
    email: EmailStr
    whatsapp: str
    nicho: Optional[str] = ""
    cidade: Optional[str] = ""
    descricao: Optional[str] = ""
    solucao_interesse: Optional[str] = ""
    origem: Optional[str] = "SITE"
    status: Optional[str] = "Novo"
    responsavel_sdr: Optional[str] = "SITE"
