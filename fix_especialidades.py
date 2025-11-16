#!/usr/bin/env python3
"""
Script para actualizar la especialidad de trabajadores existentes en DynamoDB.
Este script asigna especialidades a trabajadores que fueron registrados antes 
de que existiera el campo especialidad.
"""

import boto3
from decimal import Decimal

# Configuración
TABLE_NAME = 'UsersTable'
REGION = 'us-east-1'

# Mapeo de emails a especialidades
WORKER_ESPECIALIDADES = {
    'mauricio123@personal.edu.pe': 'TI',
    'fatima123@personal.edu.pe': 'Servicio de Limpieza',
    'mario123@personal.edu.pe': 'Seguridad',
    'maria123@personal.edu.pe': 'Electricista',
    'juan123@personal.edu.pe': 'TI',
    'pepe123@personal.edu.pe': 'Servicio de Limpieza',
    'anuel123@personal.edu.pe': 'Seguridad',
    'joaquin123@personal.edu.pe': 'Electricista',
    'emanuel123@personal.edu.pe': 'TI',
    'manuel123@personal.edu.pe': 'Servicio de Limpieza',
}

def main():
    print("🔧 Iniciando actualización de especialidades...")
    
    # Conectar a DynamoDB
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    # Primero, listar todos los trabajadores
    print("\n📋 Listando todos los usuarios de tipo 'trabajador'...")
    
    try:
        response = table.scan()
        users = response.get('Items', [])
        
        trabajadores = [u for u in users if u.get('tipo') == 'trabajador']
        
        print(f"✅ Found {len(trabajadores)} trabajadores:")
        for t in trabajadores:
            esp = t.get('especialidad', 'NO TIENE')
            print(f"  - {t['nombre']} ({t['email']}): especialidad = {esp}")
        
        print("\n🔄 Actualizando especialidades...")
        
        updated_count = 0
        skipped_count = 0
        
        for email, especialidad in WORKER_ESPECIALIDADES.items():
            try:
                # Verificar si el usuario existe
                response = table.get_item(Key={'email': email})
                
                if 'Item' not in response:
                    print(f"⚠️  Usuario {email} no existe - saltando")
                    skipped_count += 1
                    continue
                
                user = response['Item']
                
                # Solo actualizar si es trabajador
                if user.get('tipo') != 'trabajador':
                    print(f"⚠️  {email} no es trabajador (es {user.get('tipo')}) - saltando")
                    skipped_count += 1
                    continue
                
                # Actualizar especialidad
                table.update_item(
                    Key={'email': email},
                    UpdateExpression='SET especialidad = :esp',
                    ExpressionAttributeValues={
                        ':esp': especialidad
                    }
                )
                
                print(f"✅ Actualizado {user['nombre']} ({email}) → {especialidad}")
                updated_count += 1
                
            except Exception as e:
                print(f"❌ Error actualizando {email}: {e}")
        
        print(f"\n🎉 Completado!")
        print(f"  - Actualizados: {updated_count}")
        print(f"  - Saltados: {skipped_count}")
        
        # Verificar resultados
        print("\n🔍 Verificando cambios...")
        response = table.scan()
        users = response.get('Items', [])
        trabajadores = [u for u in users if u.get('tipo') == 'trabajador']
        
        print(f"\n📊 Estado final de {len(trabajadores)} trabajadores:")
        for t in trabajadores:
            esp = t.get('especialidad', 'SIN ESPECIALIDAD')
            print(f"  - {t['nombre']} ({t['email']}): {esp}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
