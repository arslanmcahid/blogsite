FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Root olmayan kullanıcı; yüklenen görseller /app/media (volume) altında saklanır.
RUN useradd --create-home --uid 1000 app && mkdir -p /app/media && chown -R app:app /app/media
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health/', timeout=4).status == 200 else 1)"
# Açılışta veritabanı değişikliklerini uygular (migrate), sonra gunicorn'u başlatır.
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-2} --access-logfile - --timeout 60"]
