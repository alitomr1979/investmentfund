# Manual de Mantenimiento (Maintenance Manual)
## Family Investment Fund App

### 1. Arquitectura del Sistema
La aplicación se compone de tres microservicios principales organizados y orquestados mediante **Docker Compose**:
*   **Base de Datos (PostgreSQL 15):** Contenedor `invest_db`. Almacena toda la información crítica del sistema con soporte ACID. Las tablas se autogeneran vía SQLAlchemy.
*   **Backend (FastAPI):** Contenedor `invest_backend`. Expone la lógica de negocios mediante una API REST en el puerto `8000`. Interactúa con la base de datos usando SQLAlchemy y `psycopg2`.
*   **Frontend (Next.js):** Contenedor `invest_frontend`. Sirve la interfaz gráfica en el puerto `3000`. 

### 2. Comandos Diarios y Mantenimiento de Contenedores
Todos los comandos deben ejecutarse desde la raíz del proyecto (`/investment_fund_app`), donde se ubica el archivo `docker-compose.yml`.

**Levantar la plataforma en background:**
```bash
docker-compose up -d --build
```
**Detener la plataforma:**
```bash
docker-compose down
```
**Ver logs en tiempo real (Backend):**
```bash
docker logs invest_backend -f
```
**Acceder a la Base de Datos:**
```bash
docker exec -it invest_db psql -U admin -d invest_fund
```

### 3. Consideraciones del Backend
*   **Librerías principales:** El archivo `requirements.txt` especifica las versiones estrictas (`FastAPI`, `Pydantic V2`, `SQLAlchemy`). Si se actualiza alguna librería, se recomienda probar exhaustivamente el manejo de `Decimal`, ya que es el núcleo contable.
*   **Pydantic V2:** El sistema utiliza `from_attributes = True` para la serialización del ORM en lugar del obsoleto `orm_mode`.
*   **Sincronización SPY (`yfinance`):** El endpoint de `/evaluate-performance` descarga data de Yahoo Finance en tiempo real. En caso de fallos de red en el servidor, este endpoint levantará un error 400.

### 4. Backups de Datos
La data persistente de PostgreSQL vive en el volumen de Docker `postgres_data`. Para hacer un backup íntegro de la BD (Altamente Recomendado):
```bash
docker exec -t invest_db pg_dumpall -c -U admin > dump_$(date +%Y-%m-%d).sql
```
