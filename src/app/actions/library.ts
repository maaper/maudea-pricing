'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Busca si un CostComponent con este nombre ya existe.
 * Si no existe, lo crea usando "Material" como categoría por defecto.
 * Retorna el ID del componente (existente o recién creado).
 */
export async function ensureCostComponentExists(name: string, defaultUnitCost: number = 0, defaultUnitType: string = 'ud'): Promise<string> {
    try {
        const existing = await prisma.costComponent.findFirst({
            where: {
                name: name.trim()
            }
        });

        if (existing) {
            return existing.id;
        }

        const newComponent = await prisma.costComponent.create({
            data: {
                name: name.trim(),
                unitCost: defaultUnitCost,
                unitType: defaultUnitType,
                category: 'Material' // Categoría neutra para nuevos creados auto
            }
        });

        revalidatePath('/library');
        return newComponent.id;
    } catch (error) {
        console.error('Error en ensureCostComponentExists:', error);
        throw error;
    }
}
