# 🧪 Guía de Pruebas - Sistema de Asignación con Filtros

## ✨ Nuevas Funcionalidades Implementadas

### 1. Filtro por Especialidad
Al asignar un incidente, ahora puedes:
- Filtrar trabajadores por especialidad (TI, Servicio de Limpieza, Seguridad, Electricista)
- Ver solo los trabajadores de la especialidad seleccionada
- Ver todas las especialidades si no seleccionas ningún filtro

### 2. Estado de Disponibilidad
Cada trabajador muestra su estado:
- **🟢 Disponible**: No tiene incidentes activos asignados
- **🔴 Ocupado**: Tiene uno o más incidentes activos (pendiente, asignado, o en_proceso)

Los trabajadores ocupados muestran cuántos incidentes tienen activos:
- `🔴 Juan Pérez - TI - Ocupado (2 incidentes)`

### 3. Lógica de Disponibilidad
Un trabajador está **disponible** cuando:
- No tiene ningún incidente asignado, O
- Todos sus incidentes asignados están en estado "resuelto" o "cerrado"

Un trabajador está **ocupado** cuando:
- Tiene al menos un incidente en estado: "pendiente", "asignado", o "en_proceso"

---

## 📋 Casos de Prueba

### Caso 1: Registro de Trabajadores con Especialidades
1. Registra 4 trabajadores, uno de cada especialidad:
   - `ti.worker@gmail.com` - Especialidad: TI
   - `limpieza.worker@gmail.com` - Especialidad: Servicio de Limpieza
   - `seguridad.worker@gmail.com` - Especialidad: Seguridad
   - `electricista.worker@gmail.com` - Especialidad: Electricista

### Caso 2: Crear Incidentes
1. Inicia sesión como estudiante (`estudiante@utec.edu.pe`)
2. Crea 3 incidentes de diferentes tipos:
   - "Problema de red WiFi" (tipo: TI)
   - "Baño sucio" (tipo: Limpieza)
   - "Foco fundido" (tipo: Eléctrico)

### Caso 3: Filtrar por Especialidad
1. Inicia sesión como admin (`admin@admin.utec.edu.pe`)
2. Haz clic en "Asignar" en el incidente "Problema de red WiFi"
3. En el filtro de especialidad, selecciona "TI"
4. ✅ **Resultado esperado**: Solo debe aparecer el trabajador de TI
5. Cambia el filtro a "Todas las especialidades"
6. ✅ **Resultado esperado**: Deben aparecer todos los trabajadores

### Caso 4: Ver Estado de Disponibilidad
1. Como admin, asigna el incidente "Problema de red WiFi" al trabajador de TI
2. Crea otro incidente de red y asígnalo al mismo trabajador de TI
3. Abre el modal de asignación de un tercer incidente
4. ✅ **Resultado esperado**: El trabajador de TI debe aparecer como:
   - `🔴 [Nombre] - TI - Ocupado (2 incidentes)`
5. Los otros trabajadores deben aparecer como:
   - `🟢 [Nombre] - [Especialidad] - Disponible`

### Caso 5: Trabajador Vuelve a Estar Disponible
1. Como admin, edita uno de los incidentes asignados al trabajador de TI
2. Cambia su estado a "Resuelto"
3. Edita el otro incidente y cámbialo también a "Resuelto"
4. Abre el modal de asignación de un nuevo incidente
5. ✅ **Resultado esperado**: El trabajador de TI debe aparecer como:
   - `🟢 [Nombre] - TI - Disponible`

### Caso 6: Múltiples Filtros
1. Registra 2 trabajadores más de TI:
   - `ti.worker2@gmail.com` - Especialidad: TI
   - `ti.worker3@gmail.com` - Especialidad: TI
2. Asigna incidentes al primero pero no a los otros dos
3. Filtra por especialidad "TI"
4. ✅ **Resultado esperado**: Debes ver:
   - `🔴 ti.worker@gmail.com - TI - Ocupado (X incidentes)`
   - `🟢 ti.worker2@gmail.com - TI - Disponible`
   - `🟢 ti.worker3@gmail.com - TI - Disponible`

---

## 🎯 Estados de Incidentes

Los incidentes pueden estar en los siguientes estados:

| Estado | Descripción | Afecta Disponibilidad |
|--------|-------------|---------------------|
| `pendiente` | Recién creado, sin asignar | ❌ No |
| `asignado` | Asignado a un trabajador | ✅ Sí (Ocupado) |
| `en_proceso` | Trabajador está trabajando en ello | ✅ Sí (Ocupado) |
| `resuelto` | Incidente completado | ❌ No (Disponible) |
| `cerrado` | Incidente cerrado/archivado | ❌ No (Disponible) |

---

## 🚀 Flujo Completo de Trabajo

### Estudiante:
1. ✅ Crear incidentes
2. ✅ Ver solo sus incidentes
3. ❌ No puede asignar ni editar

### Admin:
1. ✅ Ver todos los incidentes
2. ✅ Editar cualquier incidente
3. ✅ Asignar incidentes a trabajadores
4. ✅ Filtrar trabajadores por especialidad
5. ✅ Ver disponibilidad de trabajadores
6. ❌ No puede crear incidentes

### Trabajador:
1. ✅ Ver solo incidentes asignados a ellos
2. ❌ No puede crear ni asignar incidentes
3. ❌ No puede editar incidentes (solo trabajar en ellos)

---

## 🔧 Datos de Prueba Sugeridos

### Usuarios Admin:
```
Email: admin@admin.utec.edu.pe
Password: admin123
```

### Usuarios Estudiantes:
```
Email: juan.perez@utec.edu.pe
Password: student123
```

### Usuarios Trabajadores:
```
Email: ti.worker@gmail.com
Especialidad: TI
Password: worker123

Email: limpieza.worker@gmail.com
Especialidad: Servicio de Limpieza
Password: worker123

Email: seguridad.worker@gmail.com
Especialidad: Seguridad
Password: worker123

Email: electricista.worker@gmail.com
Especialidad: Electricista
Password: worker123
```

---

## 📝 Notas Importantes

1. **Filtro Dinámico**: El dropdown de trabajadores se actualiza automáticamente al cambiar el filtro de especialidad

2. **Conteo de Incidentes**: El sistema cuenta solo incidentes activos (no resueltos ni cerrados)

3. **Asignación Flexible**: Los admins pueden asignar trabajadores ocupados si es necesario (la opción no está deshabilitada)

4. **Estados Finales**: "Resuelto" y "Cerrado" son considerados estados finales que liberan al trabajador

5. **Indicadores Visuales**: 
   - 🟢 = Disponible
   - 🔴 = Ocupado
   - El texto muestra el número exacto de incidentes activos
