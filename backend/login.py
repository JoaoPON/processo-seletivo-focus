"""
Login do projeto (FastAPI + SQLite).

Arquivo independente: fica em backend/login.py e é ligado ao app
principal com apenas duas linhas no main.py (veja as instruções).
Usa um banco próprio (backend/login.db), sem mexer no banco.db do grupo.
"""
import hashlib
import hmac
import os
import secrets
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
DB_PATH = BASE_DIR / "login.db"

router = APIRouter()

# banco de dados
@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def gerar_hash(senha: str) -> str:
    """Guarda a senha como salt:hash (nunca a senha pura)."""
    salt = os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", senha.encode(), salt, 200_000)
    return f"{salt.hex()}:{h.hex()}"


def verificar_senha(senha: str, armazenado: str) -> bool:
    salt_hex, hash_hex = armazenado.split(":")
    novo = hashlib.pbkdf2_hmac("sha256", senha.encode(), bytes.fromhex(salt_hex), 200_000)
    return hmac.compare_digest(novo.hex(), hash_hex)


def iniciar_banco():
    with db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario TEXT UNIQUE NOT NULL,
                nome TEXT NOT NULL,
                senha_hash TEXT NOT NULL
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS sessoes (
                token TEXT PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
            )"""
        )
        # usuário fixo de teste, mudar para gerência
        existe = conn.execute("SELECT 1 FROM usuarios WHERE usuario = ?", ("teste",)).fetchone()
        if not existe:
            conn.execute(
                "INSERT INTO usuarios (usuario, nome, senha_hash) VALUES (?, ?, ?)",
                ("teste", "Usuário Teste", gerar_hash("123456")),
            )


# cria o banco/tabelas assim que o arquivo é importado
iniciar_banco()


# sessão
def usuario_logado(request: Request):
    token = request.cookies.get("sessao")
    if not token:
        return None
    with db() as conn:
        return conn.execute(
            """SELECT u.usuario, u.nome FROM sessoes s
               JOIN usuarios u ON u.id = s.usuario_id
               WHERE s.token = ?""",
            (token,),
        ).fetchone()


# API
class LoginDados(BaseModel):
    user: str
    password: str


@router.post("/login")
def login(dados: LoginDados, response: Response):
    with db() as conn:
        u = conn.execute("SELECT * FROM usuarios WHERE usuario = ?", (dados.user,)).fetchone()
        if u is None or not verificar_senha(dados.password, u["senha_hash"]):
            raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessoes (token, usuario_id) VALUES (?, ?)", (token, u["id"]))

    response.set_cookie("sessao", token, httponly=True, samesite="lax", max_age=60 * 60 * 8)
    return {"ok": True}


@router.get("/me")
def me(request: Request):
    u = usuario_logado(request)
    if u is None:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return {"usuario": u["usuario"], "nome": u["nome"]}


@router.get("/logout")
def logout(request: Request):
    token = request.cookies.get("sessao")
    if token:
        with db() as conn:
            conn.execute("DELETE FROM sessoes WHERE token = ?", (token,))
    resposta = RedirectResponse("/", status_code=303)
    resposta.delete_cookie("sessao")
    return resposta


# páginas
@router.get("/")
def pagina_login():
    return FileResponse(FRONTEND_DIR / "index.html")


@router.get("/style.css")
def estilo():
    return FileResponse(FRONTEND_DIR / "style.css")


@router.get("/dashboard.html")
def pagina_dashboard(request: Request):
    # sem login válido volta pra tela de login
    if usuario_logado(request) is None:
        return RedirectResponse("/", status_code=303)
    return FileResponse(FRONTEND_DIR / "dashboard.html")

@router.get("/script.js")
def script_js():
    return FileResponse(FRONTEND_DIR / "script.js")

# gerenciar contas
class NovaConta(BaseModel):
    nome: str
    usuario: str
    senha: str


class ExcluirConta(BaseModel):
    usuario: str
    senha: str


@router.post("/contas")
def criar_conta(dados: NovaConta, request: Request):
    if usuario_logado(request) is None:
        raise HTTPException(status_code=401, detail="Não autenticado")

    nome = dados.nome.strip()
    usuario = dados.usuario.strip()
    if not nome or not usuario:
        raise HTTPException(status_code=400, detail="Preencha o nome e o usuário")
    if len(dados.senha) < 6:
        raise HTTPException(status_code=400, detail="A senha precisa ter pelo menos 6 caracteres")

    with db() as conn:
        existe = conn.execute("SELECT 1 FROM usuarios WHERE usuario = ?", (usuario,)).fetchone()
        if existe:
            raise HTTPException(status_code=409, detail="Esse usuário já existe")
        conn.execute(
            "INSERT INTO usuarios (usuario, nome, senha_hash) VALUES (?, ?, ?)",
            (usuario, nome, gerar_hash(dados.senha)),
        )
    return {"ok": True}


@router.post("/contas/excluir")
def excluir_conta(dados: ExcluirConta, request: Request):
    atual = usuario_logado(request)
    if atual is None:
        raise HTTPException(status_code=401, detail="Não autenticado")

    with db() as conn:
        u = conn.execute("SELECT * FROM usuarios WHERE usuario = ?", (dados.usuario.strip(),)).fetchone()
        if u is None or not verificar_senha(dados.senha, u["senha_hash"]):
            raise HTTPException(status_code=400, detail="Usuário ou senha inválidos")
        if u["usuario"] == atual["usuario"]:
            raise HTTPException(status_code=400, detail="Você não pode excluir a conta em que está logada")

        conn.execute("DELETE FROM sessoes WHERE usuario_id = ?", (u["id"],))
        conn.execute("DELETE FROM usuarios WHERE id = ?", (u["id"],))
    return {"ok": True}
