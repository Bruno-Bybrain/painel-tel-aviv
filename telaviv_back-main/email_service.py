from flask_mail import Message
from mail_config import mail 
from flask import current_app
import logging # <-- NOVO: Importar módulo logging

def enviar_email(destinatario, assunto, corpo, remetente, cco=None):
    try:
        # Garante que cco sempre tem um valor válido
        bcc_list = [cco] if cco else []  

        msg = Message(
            subject=assunto,
            recipients=[destinatario],
            html=corpo,
            sender=remetente,
            bcc=bcc_list  # Usa a lista garantida
        )
        
        # O Flask-Mail precisa ser executado dentro do contexto da aplicação.
        with current_app.app_context():
            mail.send(msg)

        return True
    except Exception as e:
        # CORREÇÃO: Usar logging.error para garantir que o erro seja registrado
        logging.error(f'Erro ao enviar email: {e}', exc_info=True)
        return False