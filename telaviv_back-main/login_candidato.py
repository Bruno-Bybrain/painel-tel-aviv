# ---------------------------------------------------------------------------
# IMPORTS NECESSÁRIOS
# ---------------------------------------------------------------------------
import logging
import os
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

import requests
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash

from db import get_db_connection

# ---------------------------------------------------------------------------
# BLUEPRINT
# ---------------------------------------------------------------------------
login_candidato_bp = Blueprint("login", __name__)

# ---------------------------------------------------------------------------
# CONFIGURAÇÃO DO RECAPTCHA (variável de ambiente)
# ---------------------------------------------------------------------------
#   RECAPTCHA_REQUIRED = "1" → obrigatório (produção)
#   RECAPTCHA_REQUIRED = "0" → opcional  (ambiente de teste/local)
RECAPTCHA_REQUIRED = os.getenv("RECAPTCHA_REQUIRED", "1") != "0"

# ---------------------------------------------------------------------------
# EXECUTOR + CACHE (evita chamadas excessivas ao Google)
# ---------------------------------------------------------------------------
_executor = ThreadPoolExecutor(max_workers=4)

_RECAPTCHA_CACHE: dict[str, tuple[bool, datetime]] = {}
_RECAPTCHA_TTL = timedelta(seconds=10)   # 10 s de validade


def _verify_recaptcha_sync(token: str) -> bool:
    """Consulta síncrona ao endpoint do Google."""
    secret = "6LeixmcrAAAAAP8yf6_CvlHQBtmYJ46bMPibOK3-"   # <-- sua secret key
    url = "https://www.google.com/recaptcha/api/siteverify"
    payload = {"secret": secret, "response": token}
    try:
        resp = requests.post(url, data=payload, timeout=5)
        resp.raise_for_status()
        return resp.json().get("success", False)
    except Exception as exc:                     # pragma: no cover
        logging.error(
            f"Falha ao validar reCAPTCHA: {type(exc).__name__}: {exc}"
        )
        return False


def verify_recaptcha(token: str) -> bool:
    """Verifica o token usando cache + thread‑pool."""
    if not token:
        return False

    now = datetime.utcnow()
    cached = _RECAPTCHA_CACHE.get(token)

    if cached:
        success, expires_at = cached
        if now < expires_at:
            return success
        del _RECAPTCHA_CACHE[token]

    future = _executor.submit(_verify_recaptcha_sync, token)
    success = future.result()                     # bloqueia até a resposta chegar
    _RECAPTCHA_CACHE[token] = (success, now + _RECAPTCHA_TTL)
    return success


# ---------------------------------------------------------------------------
# ROTA DE LOGIN
# ---------------------------------------------------------------------------
@login_candidato_bp.route("/api/login", methods=["POST"])
def login():
    start_time = time.monotonic()
    logging.info("Login request received")

    # Garantimos que as variáveis existam no escopo da função
    conn = None
    cursor = None

    try:
        payload = request.get_json(silent=True) or {}
        email = payload.get("email")
        password = payload.get("password")
        recaptcha_token = payload.get("recaptcha")   # pode ser None ou ""

        # ----------------------------------------------------
        # 1️⃣ Validação básica (email + senha)
        # ----------------------------------------------------
        if not email or not password:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Email e senha são obrigatórios",
                    }
                ),
                400,
            )

        # ----------------------------------------------------
        # 2️⃣ reCAPTCHA – obrigatório ou opcional?
        # ----------------------------------------------------
        if RECAPTCHA_REQUIRED:
            if not recaptcha_token:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "reCAPTCHA é obrigatório",
                        }
                    ),
                    400,
                )
            if not verify_recaptcha(recaptcha_token):
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "reCAPTCHA inválido",
                        }
                    ),
                    400,
                )
        else:
            logging.debug("reCAPTCHA ignorado (modo teste)")

        # ----------------------------------------------------
        # 3️⃣ Busca do usuário (pool de conexões)
        # ----------------------------------------------------
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql = """
            SELECT u.id,
                   u.username,
                   u.email,
                   u.password,
                   u.status,
                   p.perfil AS role
            FROM users u
            JOIN perfil_users p ON u.type = p.id
            WHERE u.email = %s
        """
        cursor.execute(sql, (email,))
        user = cursor.fetchone()

        if not user:
            # Não revelamos se o e‑mail existe
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Credenciais inválidas",
                    }
                ),
                404,
            )

        # ----------------------------------------------------
        # 4️⃣ Conta ativa?
        # ----------------------------------------------------
        if user.get("status") != "ativo":
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Usuário inativo ou bloqueado",
                    }
                ),
                403,
            )

        # ----------------------------------------------------
        # 5️⃣ Verificação da senha
        # ----------------------------------------------------
        if not check_password_hash(user["password"], password):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Senha errada",
                    }
                ),
                401,
            )

        # ----------------------------------------------------
        # 6️⃣ Geração do JWT
        # ----------------------------------------------------
        access_token = create_access_token(
            identity=str(user["id"]),
            additional_claims={
                "role": user["role"],
                "username": user["username"],
            },
        )

        # ----------------------------------------------------
        # 7️⃣ Resposta de sucesso
        # ----------------------------------------------------
        response = {
            "success": True,
            "message": "Login realizado com sucesso",
            "access_token": access_token,
        }

        logging.info(f"Login OK – usuário: {email}")
        return jsonify(response), 200

    except Exception as exc:                      # pragma: no cover
        logging.exception("Erro inesperado no login")
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Ocorreu um erro inesperado.",
                }
            ),
            500,
        )

    finally:
        # ----------------------------------------------------
        # 8️⃣ Liberação de recursos (garantido mesmo em early returns)
        # ----------------------------------------------------
        try:
            if cursor:
                cursor.close()
        finally:
            if conn:
                conn.close()          # devolve ao pool

        elapsed_ms = (time.monotonic() - start_time) * 1000
        logging.debug(f"Tempo total de login: {elapsed_ms:.1f} ms")