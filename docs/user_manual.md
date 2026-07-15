# Manual de Usuario
## Family Investment Fund App

¡Bienvenido al sistema de administración del Fondo de Inversión Familiar! Esta guía rápida te enseñará cómo gestionar depósitos, retiros y cómo calcular tus comisiones de éxito.

### 1. El Concepto de Unidades (NAV)
El fondo funciona como un "pool" de capitales. Al depositar dinero, **no adquieres un porcentaje fijo**, sino **Unidades (Units)**.
El precio de una unidad se llama **NAV (Net Asset Value)** y se calcula así:
*   `NAV = Valor Total del Fondo / Cantidad Total de Unidades Emitidas`

Si el fondo gana dinero, el Valor Total sube, el NAV sube, y por tanto, tus unidades valen más dinero fiat.

### 2. Flujo Crítico para Depósitos y Retiros
> [!IMPORTANT]
> **REGLA DE ORO:** Siempre debes actualizar el Valor Total del fondo (NAV) *justo antes* de ingresar un depósito o retiro en el sistema.

**Paso a paso para un depósito/retiro:**
1. Ve al Dashboard Administrativo.
2. Actualiza el Valor Total del fondo (el valor del portafolio en tu broker en tiempo real). Esto fijará el precio justo (NAV) en ese momento.
3. Inmediatamente después, ingresa la transacción del usuario (Depósito o Retiro) en dólares.
4. El sistema automáticamente dividirá su dinero por el NAV para asignarle o deducirle sus Unidades.

### 3. Comisiones de Éxito (High Water Mark)
Como administrador/gestor, cobrarás si y solo si superas el rendimiento del **S&P 500 (SPY)** Y superas la barrera máxima histórica (High Water Mark) del inversor.

**¿Cómo funciona?**
1. En el Dashboard, utiliza la opción **"Evaluar Desempeño (Performance)"**.
2. Selecciona la fecha de hoy para realizar el corte de la evaluación.
3. El sistema hará el resto mágicamente:
    * Bajará los datos de la bolsa (SPY) de forma automática.
    * Calculará exactamente cuánto rindió cada inversor desde su última marca histórica (HWM).
    * Si la ganancia fue mayor al SPY, deducirá una porción de las unidades del inversor (según la comisión acordada, por defecto 50%) y las enviará a tu cuenta de Gestor.
4. Podrás ver un desglose transparente de esta auditoría en el "Libro Mayor de Comisiones" (Fee Ledger).

### 4. Preguntas Frecuentes
*   **¿Pueden los clientes ver lo que ganan?** Sí, en el Dashboard del Inversor ellos podrán ver en vivo cuántas unidades tienen, el valor del NAV, su historial de depósitos y exactamente cuántas comisiones se les han descontado.
*   **¿El fondo afecta su propio NAV al cobrar comisiones?** No. La comisión simplemente toma algunas unidades del cliente y se las da al Gestor. Las "Unidades Totales" del fondo no aumentan ni disminuyen con esto, por ende, el NAV del fondo se mantiene intacto.
