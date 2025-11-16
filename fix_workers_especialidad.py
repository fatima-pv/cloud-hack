#!/usr/bin/env python3
"""
Script para agregar el campo 'especialidad' a trabajadores existentes en DynamoDB
"""
import boto3
import sys

# Configuración
USERS_TABLE = 'UsersTable'
REGION = 'us-east-1'

# Mapeo de trabajadores a especialidades
# MODIFICA ESTO según tus necesidades
WORKER_ASSIGNMENTS = {
    'mauricio perez': 'TI',
    'fatima vera': 'Limpieza',
    'joaquin mercado': 'TI',
    'pepe': 'Seguridad',
    'manuel contreras': 'Electricista',
    'Emanuel Sanchez': 'Limpieza',
    'Juan Sanchez': 'TI',
}

def fix_workers():
    """Actualiza trabajadores en DynamoDB agregando el campo especialidad"""
    
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(USERS_TABLE)
    
    print("🔍 Buscando trabajadores en DynamoDB...")
    
    # Escanear la tabla para encontrar trabajadores
    response = table.scan(
        FilterExpression='tipo = :tipo',
        ExpressionAttributeValues={':tipo': 'trabajador'}
    )
    
    workers = response.get('Items', [])
    print(f"✅ Encontrados {len(workers)} trabajadores\n")
    
    if not workers:
        print("❌ No se encontraron trabajadores en la base de datos")
        return
    
    print("📋 Trabajadores actuales:")
    for i, worker in enumerate(workers, 1):
        especialidad = worker.get('especialidad', 'undefined')
        print(f"  {i}. {worker['nombre']} ({worker['email']}) - Especialidad actual: {especialidad}")
    
    print("\n" + "="*60)
    print("🔧 Actualizando trabajadores con especialidades...")
    print("="*60 + "\n")
    
    updated = 0
    skipped = 0
    
    for worker in workers:
        nombre = worker['nombre'].strip()
        email = worker['email']
        current_especialidad = worker.get('especialidad')
        
        # Buscar especialidad asignada
        nueva_especialidad = None
        for nombre_key, esp in WORKER_ASSIGNMENTS.items():
            if nombre_key.lower() in nombre.lower() or nombre.lower() in nombre_key.lower():
                nueva_especialidad = esp
                break
        
        if nueva_especialidad:
            # Actualizar en DynamoDB
            try:
                table.update_item(
                    Key={'email': email},
                    UpdateExpression='SET especialidad = :esp',
                    ExpressionAttributeValues={':esp': nueva_especialidad}
                )
                print(f"✅ {nombre} → {nueva_especialidad}")
                updated += 1
            except Exception as e:
                print(f"❌ Error actualizando {nombre}: {e}")
        else:
            print(f"⚠️  {nombre} - No se encontró especialidad asignada (omitido)")
            skipped += 1
    
    print("\n" + "="*60)
    print(f"✅ Actualizados: {updated}")
    print(f"⚠️  Omitidos: {skipped}")
    print("="*60)
    
    if skipped > 0:
        print("\n💡 Consejo: Para los trabajadores omitidos, puedes:")
        print("   1. Agregarlos al diccionario WORKER_ASSIGNMENTS en este script")
        print("   2. O registrarlos de nuevo con especialidad en el frontend")

if __name__ == '__main__':
    print("="*60)
    print("🔧 Fix Workers Especialidad - DynamoDB Update")
    print("="*60 + "\n")
    
    print("⚠️  IMPORTANTE: Este script actualizará trabajadores en DynamoDB")
    print("📝 Revisa el diccionario WORKER_ASSIGNMENTS antes de continuar\n")
    
    response = input("¿Continuar? (s/n): ")
    if response.lower() != 's':
        print("❌ Cancelado")
        sys.exit(0)
    
    try:
        fix_workers()
        print("\n🎉 ¡Proceso completado!")
        print("\n📌 Próximos pasos:")
        print("   1. Refresca el navegador")
        print("   2. Intenta asignar un incidente de nuevo")
        print("   3. Deberías ver los trabajadores con sus especialidades")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
