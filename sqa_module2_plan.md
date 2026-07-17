# Plan de Pruebas (Test Plan) - Módulo 2 (Resumen de Transacciones)
## Family Investment Fund App

Este documento detalla los Casos de Prueba (Test Cases) que QA ejecutará para certificar el desarrollo del Módulo 2: Resumen Global de Transacciones con Balances Históricos (Running Balances).

### Especificaciones para el Coder
Para que este módulo pase la auditoría final, se deberán cumplir las siguientes directivas:
1.  **Backend (`main.py` - `GET /transactions`):** 
    *   Inyectar el `investor_name` en la respuesta JSON.
    *   Calcular el `running_balance_units` de cada usuario hasta el momento exacto de la transacción.
    *   Calcular el `running_balance_fiat` histórico (multiplicando el running_balance_units por el NAV vigente en ese instante `nav_at_transaction`).
    *   Restringir la consulta a un máximo de 25 registros por defecto (`limit=25`).
2.  **Frontend (`transactions.js`):** 
    *   Construir una tabla visual siguiendo el patrón estético Premium (CSS Glassmorphism, Dark Mode).
    *   Las columnas requeridas son: Inversor, Tipo de Transacción, Fecha, NAV a la Fecha, Monto (Fiat), Balance de Unidades Acumulado y Balance Fiat Acumulado.

### Casos de Prueba (QA Audit)
*   **TC-01: Verificación Algorítmica de Running Balances**
    *   **Acción:** Extraer un muestreo de transacciones del API `/transactions`.
    *   **Resultado Esperado:** Matemáticamente, si el usuario X hizo un depósito de 10 unidades y luego un retiro de 2 unidades, el registro del retiro debe mostrar un `running_balance_units` de 8 unidades. La multiplicación del balance de unidades por el NAV histórico debe coincidir con `running_balance_fiat`. Precisión Decimal (ACID) estricta.
*   **TC-02: Límite de Paginación**
    *   **Acción:** Revisar la respuesta del API.
    *   **Resultado Esperado:** Un máximo de 25 registros devueltos por el backend, optimizando el rendimiento.
*   **TC-03: Renderizado Premium y Experiencia de Usuario**
    *   **Acción:** Cargar la vista `/transactions`.
    *   **Resultado Esperado:** La tabla no rompe la estética de la app. Los componentes están construidos sobre paneles `glass-panel` y los tipos de dato financiero (`$` y `%`) tienen sus correspondientes fijos a dos y cuatro decimales.
*   **TC-04: Integridad del Dato**
    *   **Acción:** Comprobar la presencia de la propiedad `investor_name`.
    *   **Resultado Esperado:** El nombre del usuario logueado en base de datos viaja emparejado a cada uno de sus registros transaccionales.
