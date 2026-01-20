from flask import Blueprint, request, jsonify, current_app
from db import get_db_connection
from werkzeug.security import generate_password_hash
from email_service import enviar_email # Seu serviço de e-mail

savenewpassword_bp = Blueprint('savenewpassword', __name__)

@savenewpassword_bp.route('/api/savenewpassword', methods=['POST'])
def savenewpassword():
    data = request.json
    token = data.get('tokena2')
    password = data.get('password')

    if not token or not password:
        return jsonify({'success': False, 'message': 'Token e nova senha são obrigatórios.'}), 400

    if len(password) < 8:
        return jsonify({'success': False, 'message': 'A nova senha deve ter pelo menos 8 caracteres.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Erro de conexão com o banco de dados'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, username, email FROM users WHERE recover = %s", (token,))
        user = cursor.fetchone()

        if not user:
            return jsonify({'success': False, 'message': 'Token de recuperação inválido ou expirado.'}), 404

        senha_hash = generate_password_hash(password)
        user_id = user['id']
        username = user['username']
        email = user['email']

        cursor.execute(
            "UPDATE users SET password = %s, recover = NULL WHERE id = %s",
            (senha_hash, user_id)
        )
        conn.commit()

        assunto = "Sua senha foi alterada com sucesso!"
        corpo_html = f"""
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Senha Redefinida</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 20px auto; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <tr style="background-color: #005d7c; color: #ffffff;">
                        <td style="padding: 20px 30px;">
                            <h1 style="margin: 0; font-size: 22px;">Senha Alterada com Sucesso</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin-top: 0; color: #333; font-size: 16px;">Olá, {username},</p>
                            <p style="color: #555; font-size: 16px; line-height: 1.5;">
                                Este é um e-mail para confirmar que a senha da sua conta foi alterada com sucesso.
                            </p>
                            <p style="color: #555; font-size: 16px; line-height: 1.5;">
                                Se você não realizou esta alteração, por favor, entre em contato com nosso suporte imediatamente.
                            </p>
                        </td>
                    </tr>
                    <tr style="background-color: #f9f9f9;">
                        <td style="padding: 20px 30px; text-align: center;">
                            <p style="margin: 0; color: #777; font-size: 14px;">Atenciosamente,<br>Grupo Tel Aviv</p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        """
        
        sender_email = current_app.config.get('MAIL_DEFAULT_SENDER', 'tec@telaviv.com.br')
        enviar_email(email, assunto, corpo_html, sender_email)

        return jsonify({'success': True, 'message': 'Senha alterada com sucesso!'}), 200

    except Exception as err:
        conn.rollback()
        print(f"Erro ao redefinir senha: {err}")
        return jsonify({'success': False, 'message': 'Ocorreu um erro ao processar sua solicitação.'}), 500
    finally:
        cursor.close()
        conn.close()