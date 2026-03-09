'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface StructureCostInput {
    name: string
    annualAmount: number
    description?: string
}

/**
 * Obtiene todos los costes de estructura fijos
 */
export async function getStructureCosts() {
    try {
        const costs = await prisma.structureCost.findMany({
            orderBy: { createdAt: 'asc' }
        })
        return { success: true, data: costs }
    } catch (error) {
        console.error('Error fetching structure costs:', error)
        return { success: false, error: 'Error al obtener costes de estructura' }
    }
}

/**
 * Crea un nuevo coste de estructura
 */
export async function createStructureCost(data: StructureCostInput) {
    try {
        const cost = await prisma.structureCost.create({
            data
        })
        revalidatePath('/structure')
        return { success: true, data: cost }
    } catch (error) {
        console.error('Error creating structure cost:', error)
        return { success: false, error: 'Error al crear coste de estructura' }
    }
}

/**
 * Actualiza un coste de estructura existente
 */
export async function updateStructureCost(id: string, data: StructureCostInput) {
    try {
        const cost = await prisma.structureCost.update({
            where: { id },
            data
        })
        revalidatePath('/structure')
        return { success: true, data: cost }
    } catch (error) {
        console.error('Error updating structure cost:', error)
        return { success: false, error: 'Error al actualizar coste de estructura' }
    }
}

/**
 * Elimina un coste de estructura
 */
export async function deleteStructureCost(id: string) {
    try {
        await prisma.structureCost.delete({
            where: { id }
        })
        revalidatePath('/structure')
        return { success: true }
    } catch (error) {
        console.error('Error deleting structure cost:', error)
        return { success: false, error: 'Error al eliminar coste de estructura' }
    }
}
