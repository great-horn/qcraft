FROM python:3-slim

WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get install -y cron && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Weekly autopilot cron (Monday 6am)
RUN echo '0 6 * * 1 python /app/app.py autopilot >> /var/log/cron.log 2>&1' > /etc/cron.d/qcraft && \
    chmod 0644 /etc/cron.d/qcraft && \
    crontab /etc/cron.d/qcraft

CMD cron && gunicorn -b 0.0.0.0:5000 --timeout 180 app:app
