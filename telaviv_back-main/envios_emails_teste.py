import secrets
import os
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

from db import get_db_connection
from email_service import enviar_email
from usuarios import montar_corpo
from app import app  # Importa a instância da app para criar o contexto


def enviar_novas_credenciais():
    """
    Busca todos os usuários, gera uma nova senha para cada um,
    atualiza no banco e envia por e-mail.
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Buscar todos os usuários ativos
        cursor.execute("SELECT id, email, username FROM users WHERE status = 'ativo'")
        usuarios = cursor.fetchall()

        if not usuarios:
            print("Nenhum usuário ativo encontrado.")
            return

        print(f"Encontrados {len(usuarios)} usuários ativos. Iniciando processo de redefinição de senha e envio de e-mails...")

        # É necessário um contexto da aplicação Flask para o Flask-Mail funcionar
        with app.app_context():
            for usuario in usuarios:
                user_id = usuario['id']
                email = usuario['email']
                username = usuario['username']

                # 2. Gerar uma nova senha segura
                nova_senha = secrets.token_urlsafe(12)
                hashed_password = generate_password_hash(nova_senha)

                # 3. Atualizar a senha no banco de dados
                cursor.execute(
                    "UPDATE users SET password = %s WHERE id = %s",
                    (hashed_password, user_id)
                )
                print(f" -> Senha atualizada para o usuário: {email}")

                # 4. Montar o corpo do e-mail usando o template
                corpo_html = montar_corpo(
                    "boasvindas.html",
                    nome=username,
                    senha=nova_senha,
                    email=email
                )

                # 5. Enviar o e-mail
                sucesso = enviar_email(
                    destinatario=email,
                    assunto="Seus Novos Dados de Acesso ao Sistema",
                    corpo=corpo_html,
                    remetente=app.config.get("MAIL_DEFAULT_SENDER")
                )

                if sucesso:
                    print(f"    -> E-mail de credenciais enviado com sucesso para: {email}")
                else:
                    print(f"    [ERRO] Falha ao enviar e-mail para: {email}")

        # 6. Salvar todas as alterações no banco
        conn.commit()
        print("\nProcesso concluído! Todas as senhas foram atualizadas e os e-mails enviados.")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"\n[ERRO GERAL] Uma exceção ocorreu: {e}")
        print("    -> Rollback executado. Nenhuma alteração foi salva no banco de dados.")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == '__main__':
    enviar_novas_credenciais()