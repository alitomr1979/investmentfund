# Análisis de Limitaciones y Escalabilidad
## Family Investment Fund App

Este documento expone las fronteras actuales de la aplicación, las limitaciones lógicas intrínsecas del diseño simplificado y los retos técnicos en caso de crecimiento exponencial.

### 1. Limitaciones Funcionales y Lógicas Actuales
*   **Actualización de NAV:** Actualmente, el valor total del fondo es ingresado manualmente por el Administrador. Esto significa que el fondo no está reflejando la volatilidad del mercado en tiempo real. Los retiros y depósitos dependen absolutamente de que el Administrador recuerde actualizar el `Total Value` del fondo *antes* de aprobar la transacción.
*   **Dividendos y Retenciones:** La lógica de unidades simplificada no contempla la re-inversión de dividendos específicos de acciones internas del fondo ni deducciones de impuestos (Withholding tax).
*   **Fondo Vacío:** Si el fondo alguna vez queda con cero inversores (`total_units = 0`), el NAV vuelve a su valor base de `100.0`. En la práctica, el administrador no debería ingresar un `Total Value` mayor a 0 cuando el fondo no tiene inversores activos. 
*   **Confiabilidad del Benchmark (SPY):** El sistema depende enteramente de Yahoo Finance (`yfinance`) para la extracción del S&P 500. `yfinance` es un wrapper no oficial y está sujeto a bloqueos de IP, caídas del servicio o discontinuación.

### 2. Retos de Expansión y Escalabilidad Futura (Technical Debt)
*   **Escalabilidad de la Base de Datos:** Si la plataforma escala a miles de usuarios, el endpoint de comisiones (`/evaluate-performance`) se volverá lento y bloqueará el thread de FastAPI, ya que ejecuta un bucle y guardados en SQL síncronos para cada usuario, junto con descargas externas de datos.
    *   **Solución Futura:** Mover la evaluación de comisiones a un worker en background (ej. Celery con Redis o RabbitMQ) para procesar el feeledger de forma asíncrona.
*   **Seguridad y Autenticación:** La estructura actual de usuarios y endpoints es abierta, basándose únicamente en el campo `user_id`. Falta incorporar un sistema de seguridad (JWT o OAuth2) para evitar que usuarios puedan acceder a los balances de otros en el dashboard de Next.js.
*   **Dependencia externa de `yfinance`:** En una aplicación institucional de largo plazo, no es viable usar un scraper gratuito.
    *   **Solución Futura:** Migrar a una API financiera institucional pagada (ej. Alpaca, Polygon.io, o Bloomberg Data License).
