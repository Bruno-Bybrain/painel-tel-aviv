# 1. Use uma imagem base do Python oficial e leve
FROM python:3.11-slim

# 2. Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# 3. Copie o arquivo de dependências PRIMEIRO para otimizar o cache
COPY requirements.txt .

# 4. Instale as dependências
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copie o resto do seu código (o .dockerignore vai garantir que só o necessário seja copiado)
COPY . .

# 6. Exponha a porta que sua aplicação vai usar
EXPOSE 8000

# 7. Comando para iniciar sua aplicação com Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]