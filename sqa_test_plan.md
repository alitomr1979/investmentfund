# Plan de Pruebas (Test Plan) - Fase 5
## Family Investment Fund App

Este documento detalla los Casos de Prueba (Test Cases) que el especialista de QA ejecutará tras la implementación de la Fase 5 por el Coder. Ninguna prueba se dará por superada a menos que todos los criterios de aceptación sean cumplidos.

### Módulo 1: Flujo de AUM y Cobro Automático (Automatización Total)
*   **TC-01: Validación del Modal de AUM**
    *   **Precondición:** Usuario Gestor (Admin) logueado en el Dashboard.
    *   **Acción:** Hacer clic en "Update AUM".
    *   **Resultado Esperado:** Se abre un Modal que obliga a introducir el `New AUM ($)` y una `Fecha de Cierre`. El envío no debe proceder si la fecha está vacía.
*   **TC-02: Actualización de NAV y Cobro en un Solo Paso**
    *   **Precondición:** Un inversor con 10 unidades. NAV inicial: $100. SPY rinde 10% en el periodo. 
    *   **Acción:** El gestor ingresa un AUM que representa un NAV de $130 con la fecha actual.
    *   **Resultado Esperado:** El backend primero actualiza el NAV (sin alterar unidades). Inmediatamente después, ejecuta la evaluación de comisiones (Performance Fee). Verifica el Hurdle Rate (HWM + 10% SPY = $110). Sobre el exceso ($20), calcula la comisión, debita las unidades del inversor y abona las unidades al Gestor. Todo en una sola transacción a nivel de experiencia de usuario.
*   **TC-03: Sincronización Temporal del SPY en Cobro Automático**
    *   **Acción:** Al enviar la "Fecha de Cierre" desde el Modal.
    *   **Resultado Esperado:** El backend descarga de `yfinance` el histórico desde el `hwm_date` individual del cliente hasta la "Fecha de Cierre" dictada por el Modal, garantizando total justeza temporal.

### Módulo 2: Configuración de Comisiones (Settings)
*   **TC-04: Modificación del Porcentaje de Comisión**
    *   **Precondición:** Gestor ingresa a la nueva ruta `/settings` (o pestaña correspondiente).
    *   **Acción:** Cambia la comisión por defecto del 50% al 20%.
    *   **Resultado Esperado:** El valor se guarda correctamente en la base de datos para los usuarios aplicables (ya sea global o por usuario, dependiendo de la implementación del Coder).
*   **TC-05: Respeto de la Nueva Comisión en Evaluación Automática**
    *   **Precondición:** Comisión rebajada al 20%. Un inversor genera un exceso de ganancia de $10.
    *   **Acción:** El gestor dispara el cobro automático vía Modal AUM.
    *   **Resultado Esperado:** La comisión debitada al cliente es estrictamente de $2 por unidad (20% de $10), y no el $5 (50%) anterior.

### Módulo 3: Manager Fee Reports
*   **TC-06: Despliegue del Historial de Cobros**
    *   **Precondición:** El fondo ha cobrado comisiones exitosamente en al menos 2 periodos.
    *   **Acción:** El Gestor navega a la vista exclusiva de reportes de comisiones (Manager Fee Reports).
    *   **Resultado Esperado:** Visualización en formato de tabla del `Fee Ledger`, mostrando el Inversor, el HWM Anterior, el Nuevo NAV, el Retorno del Fondo, el Retorno del SPY y las Unidades Transferidas al Gestor en cada transacción.

### Módulo 4: Corrección Visual de Interfaz (Bug Fix)
*   **TC-07: Desaparición del mensaje "No users found"**
    *   **Precondición:** Aplicación con el usuario Admin ya creado y logueado en la pantalla principal del Dashboard.
    *   **Acción:** Navegar por las vistas.
    *   **Resultado Esperado:** El texto espurio "No users found. Create the Master Admin account" o similares que aparecían por fallas de renderizado del componente React ha desaparecido por completo del Layout y del Dashboard.
