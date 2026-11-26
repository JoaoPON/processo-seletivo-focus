import hashlib
import hmac
import os
import secrets
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
DB_PATH = BASE_DIR / "login.db"

router = APIRouter()


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
                senha_hash TEXT NOT NULL,
                cargo TEXT NOT NULL DEFAULT 'sdr'
            )"""
        )
        conn.execute(
            """CREATE TABLE IF NOT EXISTS sessoes (
                token TEXT PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
            )"""
        )

        tem_usuario = conn.execute("SELECT 1 FROM usuarios LIMIT 1").fetchone()
        if not tem_usuario:
            conn.execute(
                "INSERT INTO usuarios (usuario, nome, senha_hash, cargo) VALUES (?, ?, ?, ?)",
                ("admin", "Administrador", gerar_hash("123456"), "admin"),
            )


iniciar_banco()


def usuario_logado(request: Request):
    token = request.cookies.get("sessao")
    if not token:
        return None
    with db() as conn:
        return conn.execute(
            """SELECT u.id, u.usuario, u.nome, u.cargo
               FROM sessoes s
               JOIN usuarios u ON u.id = s.usuario_id
               WHERE s.token = ?""",
            (token,),
        ).fetchone()


def exigir_login(request: Request):
    u = usuario_logado(request)
    if u is None:
        raise HTTPException(status_code=401, detail="Não autenticado")
    return u


def exigir_gerencia(request: Request):
    u = exigir_login(request)
    if (u["cargo"] or "").lower() not in ("gerencia", "admin"):
        raise HTTPException(status_code=403, detail="Acesso restrito à gerência ou administração")
    return u


class LoginDados(BaseModel):
    user: str
    password: str


@router.post("/login")
def login(dados: LoginDados, response: Response):
    with db() as conn:
        u = conn.execute("SELECT * FROM usuarios WHERE usuario = ?", (dados.user.strip(),)).fetchone()
        if u is None or not verificar_senha(dados.password, u["senha_hash"]):
            raise HTTPException(status_code=401, detail="Usuário ou senha inválidos")

        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessoes (token, usuario_id) VALUES (?, ?)", (token, u["id"]))

    response.set_cookie("sessao", token, httponly=True, samesite="lax", max_age=60 * 60 * 8)
    return {
        "ok": True,
        "usuario": u["usuario"],
        "nome": u["nome"],
        "cargo": u["cargo"],
    }


@router.get("/me")
def me(u=Depends(exigir_login)):
    return {
        "usuario": u["usuario"],
        "nome": u["nome"],
        "cargo": u["cargo"],
    }


@router.get("/logout")
def logout(request: Request):
    token = request.cookies.get("sessao")
    if token:
        with db() as conn:
            conn.execute("DELETE FROM sessoes WHERE token = ?", (token,))
    resposta = RedirectResponse("/", status_code=303)
    resposta.delete_cookie("sessao")
    return resposta


@router.get("/")
def pagina_login():
    return FileResponse(FRONTEND_DIR / "index.html")


@router.get("/dashboard.html")
def pagina_dashboard(request: Request):
    if usuario_logado(request) is None:
        return RedirectResponse("/", status_code=303)
    return FileResponse(FRONTEND_DIR / "dashboard.html")


# ==================== GERENCIAR CONTAS ====================

class NovaConta(BaseModel):
    nome: str
    usuario: str
    senha: str
    cargo: Literal["sdr", "gerencia"] = "sdr"


class ExcluirConta(BaseModel):
    usuario: str
    senha_atual: str


@router.get("/contas")
def listar_contas(atual=Depends(exigir_gerencia)):
    cargo_atual = (atual["cargo"] or "").lower()
    with db() as conn:
        if cargo_atual == "admin":
            rows = conn.execute(
                "SELECT usuario, nome, cargo FROM usuarios WHERE LOWER(cargo) IN ('gerencia', 'sdr') ORDER BY cargo, nome"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT usuario, nome, cargo FROM usuarios WHERE LOWER(cargo) = 'sdr' ORDER BY nome"
            ).fetchall()
    return [dict(r) for r in rows]


@router.post("/contas")
def criar_conta(dados: NovaConta, atual=Depends(exigir_gerencia)):
    cargo_atual = (atual["cargo"] or "").lower()
    if dados.cargo == "gerencia" and cargo_atual != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar contas de gerência")

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
            "INSERT INTO usuarios (usuario, nome, senha_hash, cargo) VALUES (?, ?, ?, ?)",
            (usuario, nome, gerar_hash(dados.senha), dados.cargo),
        )
    return {"ok": True}


@router.post("/contas/excluir")
def excluir_conta(dados: ExcluirConta, atual=Depends(exigir_gerencia)):
    cargo_atual = (atual["cargo"] or "").lower()
    with db() as conn:
        operador = conn.execute("SELECT * FROM usuarios WHERE id = ?", (atual["id"],)).fetchone()
        if operador is None or not verificar_senha(dados.senha_atual, operador["senha_hash"]):
            raise HTTPException(status_code=403, detail="Sua senha está incorreta")

        alvo = conn.execute("SELECT * FROM usuarios WHERE usuario = ?", (dados.usuario.strip(),)).fetchone()
        if alvo is None:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        if alvo["id"] == atual["id"]:
            raise HTTPException(status_code=400, detail="Você não pode excluir a própria conta")

        cargo_alvo = (alvo["cargo"] or "").lower()
        if cargo_alvo == "admin":
            raise HTTPException(status_code=403, detail="Contas de administrador não podem ser excluídas por aqui")
        if cargo_alvo == "gerencia" and cargo_atual != "admin":
            raise HTTPException(status_code=403, detail="Apenas administradores podem excluir contas de gerência")

        conn.execute("DELETE FROM sessoes WHERE usuario_id = ?", (alvo["id"],))
        conn.execute("DELETE FROM usuarios WHERE id = ?", (alvo["id"],))
    return {"ok": True}