from flask import Flask, request, jsonify
from flask_cors import CORS
import time
from login_candidato import login_candidato_bp
from recuperar_usuario import recuperar_usuario_bp
from savenewpassword import savenewpassword_bp
from usuarios import usuario_bp
import requests
import base64
from datetime import timedelta
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from mail_config import mail
from dotenv import load_dotenv
import os
from nexti_api import nexti_bp



load_dotenv()



app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": [
    "https://telaviv-front.vercel.app",
    "https://painel.telaviv.com.br",
    "https://paineltelaviv.bybrain.com.br",
    "https://apitelavivbac.bybrain.com.br",
    "https://paineltelavi.bybrain.com.br",
    "https://paineltelaviv.vercel.app",
    "https://docs.google.com",
    "https://forms.google.com",
    "https://script.google.com"
]}})
#CORS(app, resources={r"/*": {"origins": "*"}})
#teste producao

app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

mail.init_app(app)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
    hours=int(os.getenv('JWT_EXPIRES_HOURS', 8))
)

# Inicialize o JWTManager
jwt = JWTManager(app)

# Registre os blueprints das rotas
app.register_blueprint(login_candidato_bp)
app.register_blueprint(recuperar_usuario_bp)
app.register_blueprint(savenewpassword_bp)
app.register_blueprint(usuario_bp)
app.register_blueprint(nexti_bp)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8002, debug=True)
