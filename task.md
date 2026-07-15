# Task List: Family Investment Fund App

## Bloque 1: Configuración de la Infraestructura
- [ ] Inicialización del repositorio Git.
- [ ] Creación de archivo `docker-compose.yml` (PostgreSQL, Backend, Frontend).
- [ ] Estructura base de Backend (FastAPI, SQLAlchemy, requirements.txt, Dockerfile).
- [ ] Estructura base de Frontend (Next.js, Dockerfile).
- [ ] Configuración de la base de datos PostgreSQL.
- [ ] Implementación de la API básica (CRUD inicial y cálculo de NAV).

## Bloque 2: Backend - Autenticación y Usuarios
- [ ] Modelos de base de datos para Usuarios/Administradores.
- [ ] Rutas de API para creación, lectura, actualización y eliminación de usuarios (CRUD de inversores y admin).
- [ ] Separación de roles (Admin/Manager vs Investor).

## Bloque 3: Backend - Transacciones y NAV
- [ ] Lógica para depósitos y retiros.
- [ ] Historial y tabla de transacciones (Libro mayor).
- [ ] Actualización manual de NAV y cálculo de unidades asignadas/retiradas.

## Bloque 4: Backend - Comisiones y High Water Mark (HWM)
- [ ] Integración con `yfinance` para obtener SPY ETF.
- [ ] Lógica de evaluación periódica (ej. mensual) de rendimiento del fondo vs S&P 500.
- [ ] Implementación del método High Water Mark y asignación de unidades como comisión.
- [ ] Tabla de registro de eventos de comisiones (Fee Ledger).

## Bloque 5: Frontend - Dashboard Administrativo
- [ ] Pantalla principal de administrador (AUM total, NAV global, histórico).
- [ ] Gestión de inversores desde el frontend.
- [ ] Pantalla para actualización manual de NAV y transacciones de los usuarios.

## Bloque 6: Frontend - Dashboard Inversor
- [ ] Vista del usuario inversor (Balance, Unidades, historial de depósito/retiro).
- [ ] Desglose de comisiones pagadas.

## Bloque 7: Revisión Final y QA
- [ ] Pruebas unitarias/integrales.
- [ ] Despliegue en entorno local asegurado mediante Docker.
