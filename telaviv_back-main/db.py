# db.py
import os
import mysql.connector.pooling
from flask import current_app

# ------------------------------------------------------------
# 1️⃣  Pool de conexões – singleton
# ------------------------------------------------------------
_pool = None

def _init_pool():
    """
    Cria o pool usando as variáveis de ambiente que já estão
    disponíveis no systemd (ou no .env quando rodar localmente).
    É chamado automaticamente na primeira chamada a get_db_connection().
    """
    global _pool
    if _pool is not None:
        return  # já inicializado

    db_config = {
        "user":     os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "host":     os.getenv("DB_HOST"),
        "port":     int(os.getenv("DB_PORT", "3306")),   # fallback para 3306
        "database": os.getenv("DB_NAME"),
        "charset":  "utf8mb4",
        # Opcional: ajuste de tempo limite de conexão
        "connection_timeout": 10,
        # CORREÇÃO: Força o pool a verificar e resetar conexões perdidas
        "pool_reset_session": True,
    }

    # tamanho do pool – ajuste conforme carga esperada
    POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "10"))   # 10 conexões por padrão

    try:
        _pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name="app_pool",
            pool_size=POOL_SIZE,
            **db_config,
        )
        # Log simples (você pode trocar por logging)
        print(f"[DB] Pool criado com {POOL_SIZE} conexões.")
    except mysql.connector.Error as err:
        print(f"[DB] Falha ao criar pool: {err}")
        raise

def get_db_connection():
    """
    Retorna uma conexão já pronta do pool.
    O chamador deve fechar a conexão (conn.close()) quando terminar;
    isso devolve a conexão ao pool, não a encerra.
    """
    if _pool is None:
        _init_pool()

    try:
        conn = _pool.get_connection()
        # opcional: garantir autocommit = False (para controle manual)
        conn.autocommit = False
        return conn
    except mysql.connector.Error as err:
        print(f"[DB] Erro ao obter conexão do pool: {err}")
        raise