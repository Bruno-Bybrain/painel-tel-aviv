import secrets
import datetime
from functools import wraps
from pathlib import Path

from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from db import get_db_connection
from mail_config import mail                       # Flask‑Mail já configurado na app
from email_service import enviar_email            # Função já existente (ver abaixo)

# ----------------------------------------------------------------------
# Blueprint
# ----------------------------------------------------------------------
usuario_bp = Blueprint('usuario', __name__)

# ----------------------------------------------------------------------
# Hierarquia de perfis (quanto maior, mais privilégios)
# ----------------------------------------------------------------------
HIERARQUIA = {
    'administrador': 5,
    'diretor': 4,
    'idt': 3,
    'financeiro': 3,
    'rh': 3,
    'operacao': 2
}

# ----------------------------------------------------------------------
# FUNÇÕES AUXILIARES
# ----------------------------------------------------------------------
def montar_corpo(template_nome: str, **context) -> str:
    """
    Carrega um template HTML (arquivo .html) localizado em
    ``templates_email`` e o renderiza com as variáveis passadas em ``context``.

    Exemplo:
        corpo = montar_corpo(
            "boasvindas.html",
            nome="Ana",
            senha="abc123",
            email="ana@example.com"
        )
    """
    base_dir = Path(__file__).parent
    template_path = base_dir / "templates_email" / template_nome

    if not template_path.is_file():
        raise FileNotFoundError(f"Template de e‑mail não encontrado: {template_path}")

    raw = template_path.read_text(encoding="utf-8")
    # Jinja2 já vem instalado como dependência do Flask‑Mail
    from jinja2 import Template
    tmpl = Template(raw)
    return tmpl.render(**context)


# ----------------------------------------------------------------------
# FUNÇÃO AUXILIAR DE LOG
# ----------------------------------------------------------------------
def registrar_log(conn, mensagem: str):
    """
    Insere uma linha na tabela `log`.

    Parameters
    ----------
    conn : mysql.connector.connection.MySQLConnection
        Conexão já aberta (mesma usada na rota).
    mensagem : str
        Texto livre que será salvo em `log.mensagem`.
    """
    try:
        cur = conn.cursor()
        # Não precisamos passar data; o MySQL preenche `data_cadastro` e `update_cadastro`.
        cur.execute(
            "INSERT INTO log (mensagem) VALUES (%s)",
            (mensagem,)
        )
        # Não dá commit aqui – a chamada da rota já fez `conn.commit()`.
        cur.close()
    except Exception as exc:
        # Falha no log não deve impedir a operação principal.
        print(f"[LOG] Erro ao registrar log: {exc}")


        
# ----------------------------------------------------------------------
# DECORADOR DE AUTORIZAÇÃO POR PERFIL
# ----------------------------------------------------------------------
def role_required(perfis_permitidos):
    """
    Verifica se o usuário autenticado possui um dos perfis permitidos.
    Também disponibiliza ``g.user`` (id, username, role) para uso nas rotas.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            try:
                cursor.execute(
                    """
                    SELECT u.id, u.username, p.perfil AS role
                    FROM users u
                    JOIN perfil_users p ON u.type = p.id
                    WHERE u.id = %s
                    """,
                    (user_id,)
                )
                user = cursor.fetchone()

                if not user:
                    return jsonify({"msg": "Usuário não encontrado"}), 404

                if user["role"] not in perfis_permitidos:
                    return (
                        jsonify({"msg": "Acesso não autorizado para este perfil"}),
                        403,
                    )

                g.user = user
                return f(*args, **kwargs)
            finally:
                cursor.close()
                conn.close()
        return decorated_function
    return decorator


# ----------------------------------------------------------------------
# ROTAS
# ----------------------------------------------------------------------

# --------------------------------------------------------------
# LISTAR USUÁRIOS
# --------------------------------------------------------------
@usuario_bp.route('/api/usuarios', methods=['GET'])
@jwt_required()
def get_usuarios():
    user_id = get_jwt_identity()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Busca o próprio usuário para preencher ``g.user``
        cursor.execute(
            """
            SELECT u.id, u.username, p.perfil AS role
            FROM users u
            JOIN perfil_users p ON u.type = p.id
            WHERE u.id = %s
            """,
            (user_id,)
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({"msg": "Usuário não encontrado"}), 404

        g.user = user

        # Paginação
        page = request.args.get('pagina', 1, type=int)
        per_page = 10
        offset = (page - 1) * per_page

        # Filtros
        busca = request.args.get('busca', '')
        status = request.args.get('status', '')
        role = request.args.get('role', '')

        where_clauses = []
        params = []

        if busca:
            where_clauses.append("(u.username LIKE %s OR u.email LIKE %s)")
            params.extend([f"%{busca}%", f"%{busca}%"])
        if status:
            where_clauses.append("u.status = %s")
            params.append(status)
        if role:
            where_clauses.append("p.perfil = %s")
            params.append(role)

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

        # Total de registros (para paginação)
        count_query = f"""
            SELECT COUNT(u.id) AS total
            FROM users u
            JOIN perfil_users p ON u.type = p.id
            WHERE {where_sql}
        """
        cursor.execute(count_query, tuple(params))
        total_usuarios = cursor.fetchone()['total']
        total_paginas = (total_usuarios + per_page - 1) // per_page

        # Dados da página
        query = f"""
            SELECT u.id,
                   u.username,
                   u.email,
                   u.telefone,
                   u.status,
                   p.perfil AS role,
                   u.date AS data_cadastro
            FROM users u
            JOIN perfil_users p ON u.type = p.id
            WHERE {where_sql}
            ORDER BY u.id DESC
            LIMIT %s OFFSET %s
        """
        query_params = tuple(params + [per_page, offset])
        cursor.execute(query, query_params)
        usuarios = cursor.fetchall()

        # Serializar datas
        for u in usuarios:
            if u.get('data_cadastro'):
                u['data_cadastro'] = u['data_cadastro'].isoformat()

        return jsonify({
            "usuarios": usuarios,
            "totalPaginas": total_paginas,
            "paginaAtual": page
        })
    finally:
        cursor.close()
        conn.close()


# --------------------------------------------------------------
# LISTAR PERFIS DISPONÍVEIS
# --------------------------------------------------------------
@usuario_bp.route('/api/usuarios/perfis', methods=['GET'])
@jwt_required()
def get_perfis():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT perfil FROM perfil_users ORDER BY perfil")
        perfis = [row['perfil'] for row in cursor.fetchall()]
        return jsonify(perfis)
    except Exception as e:
        return jsonify({"msg": f"Erro ao buscar perfis: {e}"}), 500
    finally:
        cursor.close()
        conn.close()


# --------------------------------------------------------------
# CRIAR UM NOVO USUÁRIO
# --------------------------------------------------------------
@usuario_bp.route('/api/usuarios', methods=['POST'])
@jwt_required()
@role_required(['administrador'])
def create_user():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    telefone = data.get('telefone')          # campo opcional, pode ser None
    role = data.get('role')
    status = data.get('status', 'ativo')

    # Validação mínima
    if not all([username, email, role]):
        return jsonify({"msg": "Campos obrigatórios ausentes"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Verifica e‑mail duplicado
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"msg": "Email já cadastrado"}), 409

        # ------------------------------------------------------
        # VERIFICA HIERARQUIA
        # ------------------------------------------------------
        # Usuário logado (g.user) pode criar perfis iguais ou inferiores.
        if HIERARQUIA.get(g.user['role'], 0) < HIERARQUIA.get(role, 99):
            return jsonify({
                "msg": "Você não tem permissão para criar um usuário com este perfil."
            }), 403

        # Busca o ID interno do perfil
        cursor.execute("SELECT id FROM perfil_users WHERE perfil = %s", (role,))
        perfil_row = cursor.fetchone()
        if not perfil_row:
            return jsonify({"msg": "Perfil inválido"}), 400
        type_id = perfil_row['id']

        # Gera senha temporária
        password = secrets.token_urlsafe(12)
        hashed_password = generate_password_hash(password)

        # Insere o usuário (inclui telefone, que pode ser NULL)
        cursor.execute(
            """
            INSERT INTO users (username, email, telefone, password, type, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (username, email, telefone, hashed_password, type_id, status)
        )
        

        # ---------- REGISTRO NO LOG ----------
        # Mensagem que será armazenada
        msg = (
            f"{g.user['username']} criou um novo usuário: "
            f"Usuário criado: id={cursor.lastrowid}, "
            f"username='{username}', email='{email}', "
            f"Perfil de usuario='{role}'"
        )
        registrar_log(conn, msg)
        conn.commit()
        # ---------------------------------------
        # ------------------------------------------------------
        # ENVIAR EMAIL DE BOAS‑VINDAS
        # ------------------------------------------------------
        # Monta o corpo a partir do template HTML
        corpo_html = montar_corpo(
            "boasvindas.html",
            nome=username,
            senha=password,
            email=email
        )

        # Chama a função de envio (assinatura correta)
        enviar_email(
            destinatario=email,
            assunto="Bem‑vindo ao Sistema",
            corpo=corpo_html,
            remetente=current_app.config.get("MAIL_DEFAULT_SENDER", "no-reply@seusistema.com")
        )

        return jsonify({
            "msg": "Usuário criado com sucesso. A senha foi enviada por e‑mail."
        }), 201
    finally:
        cursor.close()
        conn.close()


# --------------------------------------------------------------
# ATUALIZAR USUÁRIO EXISTENTE
# --------------------------------------------------------------
@usuario_bp.route('/api/usuarios/<int:user_id>', methods=['PUT'])
@jwt_required()
@role_required(['administrador'])
def update_user(user_id):
    data = request.json
    username = data.get('username')
    email = data.get('email')
    telefone = data.get('telefone')
    role = data.get('role')
    status = data.get('status')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Busca o usuário que será editado (para checar hierarquia)
        cursor.execute(
            """
            SELECT u.id, p.perfil AS role
            FROM users u
            JOIN perfil_users p ON u.type = p.id
            WHERE u.id = %s
            """,
            (user_id,)
        )
        user_to_edit = cursor.fetchone()
        if not user_to_edit:
            return jsonify({"msg": "Usuário não encontrado"}), 404

        # ------------------------------------------------------
        # VERIFICA HIERARQUIA DO EDITOR
        # ------------------------------------------------------
        # Se o editor tem hierarquia menor que a do alvo E não está editando a si mesmo → bloqueio
        if (HIERARQUIA.get(g.user['role'], 0) <
                HIERARQUIA.get(user_to_edit['role'], 99) and
                g.user['id'] != user_id):
            return jsonify({
                "msg": "Você não tem permissão para editar este usuário."
            }), 403

        # Se o editor quer mudar o perfil para um nível superior → bloqueio
        if role and HIERARQUIA.get(g.user['role'], 0) < HIERARQUIA.get(role, 99):
            return jsonify({
                "msg": "Você não tem permissão para atribuir este perfil."
            }), 403

        # ------------------------------------------------------
        # Monta a query de atualização dinamicamente
        # ------------------------------------------------------
        update_fields = []
        params = []

        if username is not None:
            update_fields.append("username = %s")
            params.append(username)

        if email is not None:
            # Verifica se o e‑mail já está em uso por outro usuário
            cursor.execute(
                "SELECT id FROM users WHERE email = %s AND id != %s",
                (email, user_id)
            )
            if cursor.fetchone():
                return jsonify({"msg": "Email já em uso por outro usuário"}), 409
            update_fields.append("email = %s")
            params.append(email)

        if telefone is not None:
            update_fields.append("telefone = %s")
            params.append(telefone)

        if status is not None:
            update_fields.append("status = %s")
            params.append(status)

        if role is not None:
            # Converte o nome do perfil para o ID interno
            cursor.execute(
                "SELECT id FROM perfil_users WHERE perfil = %s",
                (role,)
            )
            perfil_row = cursor.fetchone()
            if not perfil_row:
                return jsonify({"msg": "Perfil inválido"}), 400
            update_fields.append("type = %s")
            params.append(perfil_row['id'])

        if not update_fields:
            return jsonify({"msg": "Nenhum dado para atualizar"}), 400

        # Finaliza a query
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s"
        cursor.execute(query, tuple(params))
        
        
        
        # ---------- REGISTRO NO LOG ----------
        # Monta a descrição das alterações feitas
        alteracoes = []
        if username is not None:
            alteracoes.append(f"username='{username}'")
        if email is not None:
            alteracoes.append(f"email='{email}'")
        if telefone is not None:
            alteracoes.append(f"telefone='{telefone}'")
        if role is not None:
            alteracoes.append(f"Perfil de usuário='{role}'")
        if status is not None:
            alteracoes.append(f"status='{status}'")

        detalhes = ", ".join(alteracoes) if alteracoes else "sem mudanças"
        msg = (
            f"{g.user['username']} editou o Usuário : id={user_id}, "
            f"{detalhes}"
        )
        registrar_log(conn, msg)
        # ---------------------------------------
        conn.commit()

        return jsonify({"msg": "Usuário atualizado com sucesso"}), 200
    finally:
        cursor.close()
        conn.close()


# --------------------------------------------------------------
# BUSCAR LOGS (apenas administradores)
# --------------------------------------------------------------
@usuario_bp.route('/api/logs', methods=['GET'])
@jwt_required()
@role_required(['administrador'])
def get_logs():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 15
        offset = (page - 1) * per_page
        busca = request.args.get('busca', '')

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Filtro de busca (texto livre na coluna mensagem)
        where_clause = "1=1"
        params = []
        if busca:
            where_clause = "mensagem LIKE %s"
            params.append(f"%{busca}%")

        base_query = f"""
            FROM log
            WHERE {where_clause}
        """

        # Total de linhas (para paginação)
        count_query = f"SELECT COUNT(id) AS total {base_query}"
        cursor.execute(count_query, tuple(params))
        total = cursor.fetchone()["total"]

        # Dados paginados
        query_params = list(params) + [per_page, offset]
        data_query = f"""
            SELECT id,
                   mensagem,
                   data_cadastro,
                   update_cadastro
            {base_query}
            ORDER BY data_cadastro DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(data_query, tuple(query_params))
        logs = cursor.fetchall()

        # Serializa datas ISO‑8601
        for log in logs:
            if log.get('data_cadastro'):
                log['data_cadastro'] = log['data_cadastro'].isoformat()
            if log.get('update_cadastro'):
                log['update_cadastro'] = log['update_cadastro'].isoformat()

        return jsonify({
            "logs": logs,
            "page": page,
            "per_page": per_page,
            "total": total
        }), 200

    except Exception as e:
        print(f"Erro ao buscar logs: {e}")
        return jsonify({"msg": "Erro interno ao buscar logs"}), 500
    finally:
        # Fechamento seguro de recursos
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()