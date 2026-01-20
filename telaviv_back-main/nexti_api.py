import os
import requests
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone, time, timedelta
from dotenv import load_dotenv
from requests.exceptions import HTTPError
import hashlib


load_dotenv()
nexti_bp = Blueprint('nexti_api', __name__, url_prefix='/api/nexti')
NEXTI_API_URL, NEXTI_CLIENT_ID, NEXTI_API_TOKEN = os.getenv('NEXTI_API_URL'), os.getenv('NEXTI_CLIENT_ID'), os.getenv('NEXTI_API_TOKEN')

# --- FUNÇÕES AUXILIARES ---
def get_nexti_access_token():
    auth_url = f"{NEXTI_API_URL}/security/oauth/token"
    params = {'grant_type': 'client_credentials', 'client_id': NEXTI_CLIENT_ID, 'client_secret': NEXTI_API_TOKEN}
    auth = (NEXTI_CLIENT_ID, NEXTI_API_TOKEN)
    try:
        response = requests.post(auth_url, params=params, auth=auth, timeout=20)
        response.raise_for_status()
        return response.json().get('access_token')
    except requests.exceptions.RequestException as e:
        print(f"[ERRO DE CONEXÃO] Falha ao obter token da Nexti: {e}")
        return None

def _populate_cache_from_all_endpoint(resource_name, headers):
    print(f"  > Populando cache para '{resource_name}'...")
    all_items, current_page, page_size = [], 0, 10000
    while True:
        url = f"{NEXTI_API_URL}/{resource_name}/all?page={current_page}&size={page_size}&sort=id,asc"
        try:
            response = requests.get(url, headers=headers, timeout=90)
            response.raise_for_status()
            response_data = response.json()
            page_content = response_data.get('content', [])
            if not page_content: break
            all_items.extend(page_content)
            if response_data.get('last', True): break
            current_page += 1
        except requests.exceptions.RequestException as e:
            print(f"  [AVISO] Falha ao buscar '{resource_name}'. Erro: {e}.")
            break
    cache_dict = {item['id']: item for item in all_items}
    print(f"  > Cache para '{resource_name}' populado com {len(cache_dict)} itens.")
    return cache_dict

def _get_api_details(url, cache, item_id, headers):
    if item_id and item_id not in cache:
        try:
            res = requests.get(f"{url}/{item_id}", headers=headers, timeout=10)
            cache[item_id] = res.json().get('value', {}) if res.ok else {}
        except requests.exceptions.RequestException as e:
            cache[item_id] = {}
    return cache.get(item_id, {})

# --- FUNÇÃO PARA BUSCAR DADOS HISTÓRICOS E CRIAR MAPAS DE SOBRESCRITA ---
def _get_historical_overrides(start_date_str, finish_date_str, headers):
    historical_overrides = {
        "workplaces": {},
        "schedules": {}
    }
    
    # 1. Busca transferências de posto
    print("  > Buscando histórico de postos de trabalho...")
    transfers_in_period, current_page, page_size = [], 0, 10000
    while True:
        url = f"{NEXTI_API_URL}/workplacetransfers/lastupdate/nextiuser/start/{start_date_str}/finish/{finish_date_str}?page={current_page}&size={page_size}&sort=id,asc"
        try:
            response = requests.get(url, headers=headers, timeout=90)
            response.raise_for_status()
            response_data = response.json()
            page_content = response_data.get('content', [])
            if not page_content: break
            transfers_in_period.extend(page_content)
            # Ordena por data da transferência para garantir que a mais recente sobrescreva as mais antigas
            transfers_in_period.sort(key=lambda x: x.get('transferDateTime', ''))
            for transfer in transfers_in_period:
                historical_overrides["workplaces"][transfer['personId']] = transfer['workplaceId']
            if response_data.get('last', True): break
            current_page += 1
        except requests.exceptions.RequestException as e:
            print(f"  [AVISO] Falha ao buscar 'workplaceTransfers'. Erro: {e}.")
            break
    print(f"  > Histórico de postos encontrado para {len(historical_overrides['workplaces'])} colaboradores.")

    # 2. Busca transferências de turno
    print("  > Buscando histórico de turnos...")
    current_page = 0
    while True:
        url = f"{NEXTI_API_URL}/scheduletransfers/lastupdate/nextiuser/start/{start_date_str}/finish/{finish_date_str}?page={current_page}&size={page_size}&sort=id,asc"
        try:
            response = requests.get(url, headers=headers, timeout=90)
            response.raise_for_status()
            response_data = response.json()
            page_content = response_data.get('content', [])
            if not page_content: break
            for transfer in page_content:
                if 'personId' in transfer and 'rotationCode' in transfer:
                    historical_overrides["schedules"][transfer['personId']] = transfer['rotationCode']
            if response_data.get('last', True): break
            current_page += 1
        except requests.exceptions.RequestException as e:
            print(f"  [AVISO] Falha ao buscar 'scheduleTransfers'. Erro: {e}.")
            break
    print(f"  > Histórico de turnos encontrado para {len(historical_overrides['schedules'])} colaboradores.")
    
    return historical_overrides

# --- FUNÇÃO CENTRAL PARA MONTAR O REGISTRO DE UM COLABORADOR ---
def _build_complete_record(person_details, caches, headers, overrides):
    person_id = person_details.get('id')
    
    # Verifica se há uma sobrescrita histórica; senão, usa o dado atual.
    workplace_id_to_use = overrides.get("workplaces", {}).get(person_id, person_details.get('workplaceId'))
    rotation_code_to_use = overrides.get("schedules", {}).get(person_id, person_details.get('rotationCode'))

    workplace_details = caches["workplaces"].get(workplace_id_to_use, {})
    client_details = caches["clients"].get(workplace_details.get('clientId'), {})
    company_details = caches["companies"].get(person_details.get('companyId'), {})
    career_details = caches["careers"].get(person_details.get('careerId'), {})
    schedule_details = caches["schedules"].get(person_details.get('scheduleId'), {})
    situation_details = _get_api_details(f"{NEXTI_API_URL}/personSituations", caches["situations"], person_details.get('personSituationId'), headers)
    business_unit_details = _get_api_details(f"{NEXTI_API_URL}/businessUnits", caches["business_units"], workplace_details.get('businessUnitId'), headers)

    schedule_description = schedule_details.get('name', '')
    cronograma, horario, turno_base = schedule_description, "N/A", ""
    if schedule_description and ',' in schedule_description:
        parts = [p.strip() for p in schedule_description.split(',')]
        cronograma, horario = parts[0], parts[1]
        if len(parts) > 2: turno_base = parts[2]

    turno_final = turno_base
    if rotation_code_to_use is not None:
        turno_final = f"{turno_base} - T:{rotation_code_to_use}" if turno_base else f"T:{rotation_code_to_use}"
    if not turno_final: turno_final = "N/A"
    
    workplace_name = workplace_details.get('name')
    formatted_workplace_name = f"Posto - {workplace_name}" if workplace_name else None

    return {
        "Matricula": person_details.get('enrolment'), "Nome Colaborador": person_details.get('name'),
        "CPF": person_details.get('cpf'), "Data Admissao": person_details.get('admissionDate'),
        "Data Demissao": person_details.get('demissionDate'), "Nome Posto de Trabalho": formatted_workplace_name,
        "Razao Social Empresa": company_details.get('companyName'), "Cliente": client_details.get('name'),
        "Unidade de Negocio": business_unit_details.get('name'), "Descricao Cargo": career_details.get('name'),
        "Descricao Situacao": situation_details.get('description'), "Cronograma": cronograma,
        "Horario": horario, "Turno": turno_final, "ID Colaborador": person_id,
    }

# --- ENDPOINT PRINCIPAL COM A LÓGICA DE MESCLAGEM E REORDENAÇÃO ---
@nexti_bp.route('/colaboradores_data', methods=['POST'])
@jwt_required()
def get_colaboradores_data():
    try:
        access_token_nexti = get_nexti_access_token()
        if not access_token_nexti: raise Exception("Falha na autenticação com a API da Nexti.")
        headers = {'Authorization': f'Bearer {access_token_nexti}'}

        # 1. Pré-carrega todos os dados de referência essenciais
        caches = {
            "persons": _populate_cache_from_all_endpoint("persons", headers),
            "workplaces": _populate_cache_from_all_endpoint("workplaces", headers),
            "companies": _populate_cache_from_all_endpoint("companies", headers),
            "clients": _populate_cache_from_all_endpoint("clients", headers),
            "careers": _populate_cache_from_all_endpoint("careers", headers),
            "schedules": _populate_cache_from_all_endpoint("schedules", headers),
            "situations": {}, "business_units": {}
        }
        
        data = request.get_json() or {}
        start_date_from_req, finish_date_from_req = data.get('start'), data.get('finish')
        
        historical_overrides = {}
        if start_date_from_req and finish_date_from_req:
            # 2. Se houver data, busca os dados históricos para sobrescrever
            print("[INFO] Datas fornecidas. Buscando dados históricos para mesclagem...")
            API_DATE_FORMAT = "%d%m%Y%H%M%S"
            start_dt_obj = datetime.strptime(start_date_from_req[:8], "%d%m%Y")
            finish_dt_obj = datetime.strptime(finish_date_from_req[:8], "%d%m%Y")
            start_dt_adjusted = datetime.combine(start_dt_obj.date(), time.min)
            finish_dt_adjusted = datetime.combine(finish_dt_obj.date(), time.max)
            start_date_str = start_dt_adjusted.strftime(API_DATE_FORMAT)
            finish_date_str = finish_dt_adjusted.strftime(API_DATE_FORMAT)
            
            historical_overrides = _get_historical_overrides(start_date_str, finish_date_str, headers)
        else:
            print("[INFO] Nenhuma data fornecida. Gerando relatório de estado atual.")

        # 3. Monta o relatório final sempre com base na lista geral de ativos
        active_persons = [p for p in caches["persons"].values() if p.get('personSituationId') in [1, 2]]
        print(f"[INFO] Montando relatório final com base em {len(active_persons)} colaboradores ativos.")
        
        database_completa = []
        for person_details in active_persons:
            # 4. Para cada pessoa, constrói o registro aplicando as sobrescritas históricas (se existirem)
            registro = _build_complete_record(person_details, caches, headers, historical_overrides)
            database_completa.append(registro)
        
        # 5. Reordena a lista para colocar os colaboradores com dados históricos no topo
        overridden_person_ids = set(historical_overrides.get("workplaces", {}).keys()) | set(historical_overrides.get("schedules", {}).keys())
        if overridden_person_ids:
            print(f"  > Reordenando relatório para priorizar {len(overridden_person_ids)} colaboradores com dados históricos.")
            # A função 'key' retorna 0 para quem deve vir primeiro, e 1 para os demais.
            database_completa.sort(key=lambda record: 0 if record.get('ID Colaborador') in overridden_person_ids else 1)

        return jsonify(database_completa)

    except HTTPError as http_err:
        return jsonify({"error": f"Erro na API Nexti: {http_err}"}), http_err.response.status_code if http_err.response else 500
    except Exception as e:
        print(f"[ERRO GERAL] Um erro inesperado ocorreu: {e}")
        return jsonify({"error": str(e)}), 500





# --- ROTA PARA O GOOGLE SHEETS COM A SUA LÓGICA DE DUPLA VERIFICAÇÃO ---
@nexti_bp.route('/google_sheet_sync', methods=['GET'])
def google_sheet_sync():
    """
    Rota segura para o Google Sheets com a sua lógica de verificação em duas etapas.
    """
    try:
        expected_hash = os.getenv('FLASK_API_KEY')
        salt = os.getenv('SALT')
        received_api_key = request.headers.get('X-API-KEY')

        if not all([expected_hash, salt, received_api_key]):
            return jsonify({"error": "Acesso não autorizado. Configuração inválida ou chave não fornecida."}), 401

        # --- VERIFICAÇÃO 1: MD5 DO TOKEN ---
        # Pega o token recebido (texto puro) e criptografa em MD5.
        generated_hash = hashlib.md5(received_api_key.encode('utf-8')).hexdigest()

        # Compara o resultado com a FLASK_API_KEY do .env.
        if generated_hash != expected_hash:
            return jsonify({"error": "Acesso não autorizado (Falha na Verificação 1: Chave MD5 incorreta)"}), 401
        
        print("[INFO] Verificação 1 (MD5) bem-sucedida.")

        # --- VERIFICAÇÃO 2: HASH + SALT ---
        # Pega o hash da verificação anterior e o junta com o salt.
        string_to_check = generated_hash + salt
        expected_string = expected_hash + salt
        
        # Compara o resultado da junção para a segunda autorização.
        if string_to_check != expected_string:
            return jsonify({"error": "Acesso não autorizado (Falha na Verificação 2: Inconsistência de Salt)"}), 401

        print("[INFO] Verificação 2 (Hash+Salt) bem-sucedida. Acesso autorizado.")
        
        # Se ambas as verificações passaram, a ação é autorizada.
        
        # --- LÓGICA PRINCIPAL PARA BUSCAR DADOS (MODO ESTADO ATUAL) ---
        access_token_nexti = get_nexti_access_token()
        if not access_token_nexti: raise Exception("Falha na autenticação com a API da Nexti.")
        headers = {'Authorization': f'Bearer {access_token_nexti}'}
        caches = {
            "persons": _populate_cache_from_all_endpoint("persons", headers),
            "workplaces": _populate_cache_from_all_endpoint("workplaces", headers),
            "companies": _populate_cache_from_all_endpoint("companies", headers),
            "clients": _populate_cache_from_all_endpoint("clients", headers),
            "careers": _populate_cache_from_all_endpoint("careers", headers),
            "schedules": _populate_cache_from_all_endpoint("schedules", headers),
            "situations": {}, "business_units": {}
        }
        active_persons = [p for p in caches["persons"].values() if p.get('personSituationId') in [1, 2]]
        print(f"[INFO] Montando relatório com base em {len(active_persons)} colaboradores ativos.")
        database_completa = []
        for person_details in active_persons:
            # Para a rota do Google Sheets, não há dados históricos, então 'overrides' é um dicionário vazio.
            registro = _build_complete_record(person_details, caches, headers, {})
            database_completa.append(registro)

        return jsonify(database_completa)

    except Exception as e:
        print(f"[ERRO GERAL] Um erro inesperado ocorreu na rota de sync: {e}")
        return jsonify({"error": str(e)}), 500