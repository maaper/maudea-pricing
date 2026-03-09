'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface CostComponentInput {
    name: string
    unitCost: number
    unitType: string
    category: string
}

/**
 * Obtiene todos los componentes de coste
 */
export async function getCostComponents() {
    try {
        const components = await prisma.costComponent.findMany({
            orderBy: [
                { category: 'asc' },
                { name: 'asc' }
            ]
        })
        return { success: true, data: components }
    } catch (error) {
        console.error('Error fetching cost components:', error)
        return { success: false, error: 'Error al obtener componentes de coste' }
    }
}

/**
 * Crea un nuevo componente de coste
 */
export async function createCostComponent(data: CostComponentInput) {
    try {
        const component = await prisma.costComponent.create({
            data
        })
        revalidatePath('/components')
        return { success: true, data: component }
    } catch (error) {
        console.error('Error creating cost component:', error)
        return { success: false, error: 'Error al crear componente' }
    }
}

/**
 * Actualiza un componente de coste
 */
export async function updateCostComponent(id: string, data: CostComponentInput) {
    try {
        const component = await prisma.costComponent.update({
            where: { id },
            data
        })
        revalidatePath('/components')
        return { success: true, data: component }
    } catch (error) {
        console.error('Error updating cost component:', error)
        return { success: false, error: 'Error al actualizar componente' }
    }
}

/**
 * Elimina un componente de coste
 */
export async function deleteCostComponent(id: string) {
    try {
        // Si queremos proteger la eliminación si está en uso en Operations, Prisma lo controlará con la relación
        await prisma.costComponent.delete({
            where: { id }
        })
        revalidatePath('/components')
        return { success: true }
    } catch (error) {
        console.error('Error deleting cost component:', error)
        return { success: false, error: 'Error al eliminar componente. Puede que esté en uso en alguna operación.' }
    }
}
