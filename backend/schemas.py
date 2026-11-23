from pydantic import BaseModel, EmailStr
from typing import Optional


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


class LeadFrontendSchema(BaseModel):
    empresa: str
    nome_completo: str
    whatsapp: str
    email: Optional[str] = ""
    nicho: Optional[str] = ""
    cidade: Optional[str] = ""
    solucao_interesse: str
    descricao: str



class InteracaoCreateSchema(BaseModel):
    id_lead: str
    acao: str
    pauta: Optional[str] = ""
    responsavel: str
    data_agendada: Optional[str] = ""
    hora_agendada: Optional[str] = ""
    data_realizada: Optional[str] = ""
    hora_realizada: Optional[str] = ""
    resultado: Optional[str] = ""
    observacoes: Optional[str] = ""


class InteracaoUpdateSchema(BaseModel):
    acao: Optional[str] = None
    pauta: Optional[str] = None
    responsavel: Optional[str] = None
    data_agendada: Optional[str] = None
    hora_agendada: Optional[str] = None
    data_realizada: Optional[str] = None
    hora_realizada: Optional[str] = None
    resultado: Optional[str] = None
    observacoes: Optional[str] = None
