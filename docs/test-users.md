# Ejemplos de Usuarios para Testing

## Estudiantes (@utec.edu.pe)
```json
{
  "nombre": "Carlos Mendoza",
  "email": "carlos.mendoza@utec.edu.pe",
  "password": "estudiante123"
}
```

```json
{
  "nombre": "Ana López",
  "email": "ana.lopez@utec.edu.pe",
  "password": "password123"
}
```

## Administradores (@admin.utec.edu.pe)
```json
{
  "nombre": "Admin Principal",
  "email": "admin@admin.utec.edu.pe",
  "password": "admin123456"
}
```

```json
{
  "nombre": "Super Admin",
  "email": "super.admin@admin.utec.edu.pe",
  "password": "superadmin123"
}
```

## Trabajadores (otros dominios)
```json
{
  "nombre": "Pedro Trabajador",
  "email": "pedro.trabajador@gmail.com",
  "password": "trabajador123"
}
```

```json
{
  "nombre": "Maria Empleada",
  "email": "maria@empresa.com",
  "password": "empleada123"
}
```

## Scripts de Testing

### Registrar todos los usuarios de prueba (bash)
```bash
API_URL="https://YOUR_API_URL/dev/auth/register"

# Estudiante 1
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Carlos Mendoza","email":"carlos.mendoza@utec.edu.pe","password":"estudiante123"}'

# Estudiante 2
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana López","email":"ana.lopez@utec.edu.pe","password":"password123"}'

# Admin 1
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Admin Principal","email":"admin@admin.utec.edu.pe","password":"admin123456"}'

# Trabajador 1
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Pedro Trabajador","email":"pedro.trabajador@gmail.com","password":"trabajador123"}'
```

### Login de prueba
```bash
API_URL="https://YOUR_API_URL/dev/auth/login"

# Login como estudiante
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos.mendoza@utec.edu.pe","password":"estudiante123"}'

# Login como admin
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.utec.edu.pe","password":"admin123456"}'
```
