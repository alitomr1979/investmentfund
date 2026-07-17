# Plan de Pruebas (Test Plan) - Bugfix Numpy Incompatibility
## Family Investment Fund App

Este documento detalla el procedimiento de corrección de errores (Bugfix) para el error crítico 500 detectado durante la actualización del AUM (`ValueError: numpy.dtype size changed`).

### Descripción del Problema
Al reconstruir el contenedor Docker, el gestor de paquetes de Python instaló la versión más reciente de `numpy` (2.x). Esta versión presenta una incompatibilidad binaria con la versión de `pandas` (2.1.0) fijada en nuestro proyecto, provocando un fallo catastrófico en el backend al intentar contactar la API de Yahoo Finance (yfinance).

### Instrucciones para el Coder
Para que el Bugfix sea aceptado en QA, el Coder deberá realizar los siguientes pasos de forma obligatoria:
1.  **Modificar Dependencias:** Editar el archivo `backend/requirements.txt` y agregar explícitamente `numpy<2.0.0` para forzar la instalación de una versión compatible (1.x).
2.  **Reconstrucción:** Reconstruir la imagen de Docker del backend (`invest_backend`) para que el gestor `pip` purgue la versión problemática y aplique el downgrade.

### Casos de Prueba (QA Audit)
*   **TC-01: Verificación de Requisitos**
    *   **Acción:** Inspeccionar el archivo `backend/requirements.txt`.
    *   **Resultado Esperado:** Presencia de la línea `numpy<2.0.0`.
*   **TC-02: Actualización de AUM Exitosa (Smoke Test)**
    *   **Precondición:** Backend funcionando con los nuevos binarios de numpy instalados y el Frontend sirviendo.
    *   **Acción:** El Gestor inicia sesión y ejecuta un "Update AUM" ingresando un nuevo valor y una fecha.
    *   **Resultado Esperado:** El Modal procesará la solicitud. El backend descargará exitosamente los datos históricos de SPY vía `yfinance` e internamente usará `pandas` sin arrojar errores. El AUM se actualizará exitosamente en la plataforma, y el error 500 (`ValueError: numpy.dtype size changed`) no volverá a presentarse.
