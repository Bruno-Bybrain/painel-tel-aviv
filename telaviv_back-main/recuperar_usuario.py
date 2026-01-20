from flask import Blueprint, request, jsonify, current_app, render_template_string
from db import get_db_connection
from werkzeug.security import generate_password_hash
import secrets
from email_service import enviar_email 

recuperar_usuario_bp = Blueprint('recuperacao', __name__)



@recuperar_usuario_bp.route('/api/recuperarPassword', methods=['POST'])
def solicitar_recuperacao():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({'success': False, 'message': 'O campo email é obrigatório'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'success': False, 'message': 'Erro de conexão com o banco de dados'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, username, status FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user or user['status'] != 'ativo':
            return jsonify({
                'success': True,
                'message': 'Se um usuário com este e-mail existir e estiver ativo, um link de recuperação foi enviado.'
            }), 200

        token_recuperacao = secrets.token_hex(32)
        username = user['username']

        cursor.execute("UPDATE users SET recover = %s WHERE id = %s", (token_recuperacao, user['id']))
        conn.commit()

        frontend_url = current_app.config.get('FRONTEND_URL', 'https://paineltelaviv.bybrain.com.br')
        sender_email = current_app.config.get('MAIL_DEFAULT_SENDER', 'tec@telaviv.com.br')

        link_recuperacao = f"{frontend_url}/recuperar/{token_recuperacao}"

        assunto = "Recuperação de Senha"
        corpo_html = f"""
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperação de Senha</title>
            <style>
                /* Estilos para clientes de e-mail que suportam <style> */
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                }}
                .button:hover {{
                    background-color: #004b63 !important;
                }}
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">

            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td style="padding: 20px 0;">
                        <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-radius: 10px;">
                            
                            <tr>
                                <td align="center" style="background-color: #005d7c; padding: 30px; border-radius: 10px 10px 0 0;">
                                    <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Recuperação de Senha</h1>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 30px 40px;">
                                    <h2 style="color: #333333; font-size: 20px; font-weight: 600; margin-top: 0;">Olá, {username}!</h2>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                                        Recebemos uma solicitação para redefinir a senha da sua conta. Se foi você, pode prosseguir com segurança.
                                    </p>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                                        Para criar uma nova senha, clique no botão abaixo. Este link de recuperação é válido por 1 hora.
                                    </p>
                                    
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td align="center" style="padding: 20px 0;">
                                                <a href="{link_recuperacao}" target="_blank" class="button" style="background-color: #005d7c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: 500; display: inline-block;">
                                                    Redefinir Minha Senha
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                                        Se você não solicitou esta alteração, nenhuma ação é necessária e você pode ignorar este e-mail com segurança.
                                    </p>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 20px 40px; border-top: 1px solid #eeeeee;">
                                    <p style="color: #777777; font-size: 14px; margin: 0; text-align: center;">
                                        Atenciosamente,<br>
                                        <strong>Grupo Tel Aviv</strong>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

        </body>
        </html>
        """

        if enviar_email(email, assunto, corpo_html, sender_email):
            return jsonify({
                'success': True,
                'message': 'Se um usuário com este e-mail existir e estiver ativo, um link de recuperação foi enviado.'
            }), 200
        else:
            return jsonify({'success': False, 'message': 'Não foi possível enviar o e-mail de recuperação.'}), 500

    except Exception as e:
        conn.rollback()
        print(f"Erro ao solicitar recuperação: {e}")
        return jsonify({'success': False, 'message': 'Ocorreu um erro ao processar a solicitação.'}), 500
    finally:
        cursor.close()
        conn.close()


