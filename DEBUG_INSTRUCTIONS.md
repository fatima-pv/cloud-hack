# 🔧 Instrucciones de Depuración

## Para encontrar el problema con el modal de asignación

1. **Abre el frontend en tu navegador**
2. **Abre la Consola de Desarrollador**:
   - Chrome/Edge: `Cmd + Option + J` (Mac) o `F12` (Windows)
   - Firefox: `Cmd + Option + K` (Mac) o `F12` (Windows)

3. **Inicia sesión como Admin**

4. **Haz clic en "Asignar" en un incidente**

5. **Revisa los logs en la consola**:
   
   Deberías ver algo como:
   ```
   Workers loaded: [...]
   All incidents: [...]
   Unique especialidades: ["TI", "Servicio de Limpieza", ...]
   Workers with status: [...]
   Filtering by: 
   Filtered workers: [...]
   Worker select populated with X workers
   Assign form found: <form>
   ```

6. **Si NO ves las especialidades** en el dropdown:
   - Verifica que `Unique especialidades` muestre un array con valores
   - Si está vacío, significa que los trabajadores no tienen especialidad guardada

7. **Para registrar trabajadores con especialidad**:
   - Ve a `register.html`
   - Usa un email que NO sea `@utec.edu.pe` ni `@admin.utec.edu.pe`
   - Ejemplo: `trabajador@gmail.com`
   - Deberías ver aparecer el campo de especialidad
   - Selecciona una especialidad (TI, Limpieza, etc.)
   - Completa el registro

8. **Si el botón "Asignar" no funciona**:
   - Cuando hagas clic, deberías ver en consola: `Form submitted!`
   - Si no ves nada, hay un problema con el event listener
   - Comparte el error que veas en la consola

## Logs esperados al hacer clic en "Asignar":

```
Form submitted!
Selected worker: trabajador@gmail.com
Attempting to assign to: trabajador@gmail.com
Assignment response: {...}
```

## Si hay error en la asignación:

Busca en la consola un mensaje que diga:
```
Assignment error: ...
```

Y comparte ese error completo.
