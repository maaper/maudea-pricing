'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Interfaz para actualización en lote
export interface UpdateSettingInput {
    key: string;
    value: string;
}

/**
 * Obtiene todas las configuraciones globales
 */
export async function getSettings() {
    try {
        const settings = await prisma.setting.findMany()
        // Transformar array en un simple objeto { key: value } para fácil acceso
        const settingsMap = settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {} as Record<string, string>);
        return { success: true, data: settingsMap }
    } catch (error) {
        console.error('Error fetching settings:', error)
        return { success: false, error: 'Error al obtener configuración' }
    }
}

/**
 * Actualiza múltiples configuraciones globales
 */
export async function updateSettings(inputs: UpdateSettingInput[]) {
    try {
        const transactions = inputs.map(input =>
            prisma.setting.upsert({
                where: { key: input.key },
                update: { value: input.value },
                create: { key: input.key, value: input.value }
            })
        )

        await prisma.$transaction(transactions)

        revalidatePath('/')
        revalidatePath('/structure')
        return { success: true }
    } catch (error) {
        console.error('Error updating settings:', error)
        return { success: false, error: 'Error al actualizar configuración' }
    }
}
