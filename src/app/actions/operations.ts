'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { calculateOperationPrices, OperationInput } from '@/lib/calculator'
import { allocateTargetPriceToItems } from '@/lib/pricing_allocator'

export interface SaveOperationInput {
    id?: string
    name: string
    date?: string // Formato YYYY-MM-DD o ISO
    type: string // "B2B" o "SERVICES"
    clientId?: string
    clientName?: string
    status: string
    overheadPct: number
    marginPct: number
    riskPct: number
    aiSuggestedReasoning?: string
    items: Array<{
        id?: string
        costComponentId?: string
        name: string
        unitQuantity: number
        isCommonCost?: boolean

        // Novedad: Propiedades de importación
        isImport?: boolean
        tariffCode?: string
        countryOfOrigin?: string
        tariffPct?: number
        tariffDescription?: string

        // Novedad: Divisas
        originalCurrency?: string
        originalCost?: number
        exchangeRate?: number

        // Desglose (opcional por compatibilidad y simplificación)
        baseUnitCost?: number
        freightCost?: number
        insuranceCost?: number
        customsCost?: number
        socialSecurity?: number
        preventionCost?: number
        rcInsuranceCost?: number
        otherCosts?: number

        // Total unitario calculado
        unitCost: number
    }>
}

/**
 * Recalcula y guarda una operación completa
 */
export async function saveOperation(data: SaveOperationInput) {
    try {
        // 0. Conciliación de Cliente: Si hay nombre pero no ID, buscar o crear.
        let targetClientId = data.clientId;
        if (!targetClientId && data.clientName && data.clientName.trim() !== '') {
            const existingClient = await prisma.client.findFirst({
                where: { name: { equals: data.clientName.trim() } }
            });

            if (existingClient) {
                targetClientId = existingClient.id;
            } else {
                const newClient = await prisma.client.create({
                    data: { name: data.clientName.trim() }
                });
                targetClientId = newClient.id;
            }
        }

        // 1. Obtener configuraciones globales para impuestos y reservas
        const globalSettings = await prisma.setting.findMany({
            where: {
                key: { in: ['corporate_tax_pct', 'legal_reserve_pct'] }
            }
        })

        const settingsMap = globalSettings.reduce((acc: Record<string, number>, s: { key: string; value: string }) => {
            acc[s.key] = parseFloat(s.value)
            return acc
        }, {} as Record<string, number>)

        const corporateTaxPct = settingsMap['corporate_tax_pct'] ?? 0.25
        const legalReservePct = settingsMap['legal_reserve_pct'] ?? 0.20

        // 2. Preparar el input para el motor de cálculo
        const calcInput: OperationInput = {
            items: data.items.map(i => ({
                name: i.name,
                unitQuantity: i.unitQuantity,
                unitCost: i.unitCost // Pasamos el unitCost total ya agregado
            })),
            overheadPct: data.overheadPct,
            marginPct: data.marginPct,
            riskPct: data.riskPct,
            corporateTaxPct,
            legalReservePct
        }

        // 3. Calcular en el motor central
        const calcResult = calculateOperationPrices(calcInput)

        // Helper map function for items
        const mapItem = (item: SaveOperationInput['items'][0], tmpId: string) => ({
            id: item.id || tmpId, // Mantener IDs o asignar temporal para el mapeo
            name: item.name,
            unitQuantity: item.unitQuantity,
            unitCost: item.unitCost,
            totalCost: item.unitQuantity * item.unitCost,
            costComponentId: item.costComponentId || null,
            isCommonCost: item.isCommonCost || false,
            isImport: item.isImport || false,
            tariffCode: item.tariffCode || null,
            tariffDescription: item.tariffDescription || null,
            countryOfOrigin: item.countryOfOrigin || null,
            tariffPct: item.tariffPct || null,

            baseUnitCost: item.baseUnitCost || item.unitCost || 0,
            freightCost: item.freightCost || 0,
            insuranceCost: item.insuranceCost || 0,
            customsCost: item.customsCost || 0,
            socialSecurity: item.socialSecurity || 0,
            preventionCost: item.preventionCost || 0,
            rcInsuranceCost: item.rcInsuranceCost || 0,
            otherCosts: item.otherCosts || 0,

            originalCurrency: item.originalCurrency || 'EUR',
            originalCost: item.originalCost ?? null,
            exchangeRate: item.exchangeRate || 1.0,
        })

        // Novedad: Asegurar que los componentes existen
        const { ensureCostComponentExists } = await import('./library');
        const itemsWithResolvedIds = await Promise.all(
            data.items.map(async (item) => {
                let finalCompId = item.costComponentId;
                if (!finalCompId && item.name.trim()) {
                    finalCompId = await ensureCostComponentExists(item.name, item.unitCost);
                }
                return { ...item, costComponentId: finalCompId };
            })
        );

        const itemsWithTmpIds = itemsWithResolvedIds.map((it, idx) => mapItem(it, `tmp_${idx}`))

        // 3.5. Reparto de precios unitarios B2B / Services
        const allocatedPrices = allocateTargetPriceToItems(
            itemsWithTmpIds.map(i => ({
                id: i.id,
                unitQuantity: i.unitQuantity,
                totalCost: i.totalCost,
                isCommonCost: i.isCommonCost
            })),
            calcResult
        )

        // Enriquecemos el resultado del reparto
        const enrichedAllocatedPrices = allocatedPrices.map(ap => {
            const srcItem = itemsWithTmpIds.find(i => i.id === ap.itemId)
            return {
                ...ap,
                name: srcItem?.name ?? '',
                isCommonCost: srcItem?.isCommonCost ?? false,
                unitQuantity: srcItem?.unitQuantity ?? 0
            }
        })

        const mappedResultCache = {
            totalDirectCost: calcResult.totalDirectCost,
            totalOverheadCost: calcResult.totalOverheadCost,
            totalCost: calcResult.totalCost,
            targetPrice: calcResult.targetPrice,
            expectedMargin: calcResult.expectedMargin,
            expectedBenefit: calcResult.expectedBenefit,
            isTax: calcResult.corporateTax,
            legalReserve: calcResult.legalReserve,
            netBenefit: calcResult.netBenefit,
            itemsCalculatedPrices: JSON.stringify(enrichedAllocatedPrices)
        }

        const itemsPayload = itemsWithTmpIds.map(i => {
            const { id, ...rest } = i;
            return rest;
        });

        // 4. Guardar en Base de Datos (Transacción)
        const result = await prisma.$transaction(async (tx) => {
            let operation

            // Si existe, actualizamos. Si no, creamos.
            if (data.id) {
                // Eliminar items antiguos primero
                await tx.operationCostItem.deleteMany({ where: { operationId: data.id } })

                operation = await tx.operation.update({
                    where: { id: data.id },
                    data: {
                        name: data.name,
                        type: data.type,
                        clientId: targetClientId || null,
                        clientName: data.clientName,
                        status: data.status,
                        date: data.date ? new Date(data.date) : new Date(),
                        overheadPct: data.overheadPct,
                        marginPct: data.marginPct,
                        riskPct: data.riskPct,
                        aiSuggestedReasoning: data.aiSuggestedReasoning || null,
                        items: { create: itemsPayload },
                        resultCache: {
                            upsert: {
                                create: mappedResultCache,
                                update: mappedResultCache
                            }
                        }
                    },
                    include: { items: true, resultCache: true }
                })
            } else {
                operation = await tx.operation.create({
                    data: {
                        name: data.name,
                        type: data.type,
                        clientId: data.clientId || null,
                        clientName: data.clientName,
                        status: data.status,
                        date: data.date ? new Date(data.date) : new Date(),
                        overheadPct: data.overheadPct,
                        marginPct: data.marginPct,
                        riskPct: data.riskPct,
                        aiSuggestedReasoning: data.aiSuggestedReasoning || null,
                        items: { create: itemsPayload },
                        resultCache: {
                            create: mappedResultCache
                        }
                    },
                    include: { items: true, resultCache: true }
                })
            }

            return operation
        })

        revalidatePath('/')
        revalidatePath('/operations')
        return { success: true, data: result }
    } catch (error) {
        console.error('Error saving operation:', error)
        return { success: false, error: 'Error al procesar y guardar la operación.' }
    }
}

/**
 * Obtiene la lista de presupuestos creados
 */
export async function getOperations() {
    try {
        const ops = await prisma.operation.findMany({
            include: {
                resultCache: true,
                client: true
            },
            orderBy: { updatedAt: 'desc' }
        })
        return { success: true, data: ops }
    } catch (error) {
        console.error('Error fetching operations:', error)
        return { success: false, error: 'Error al obtener presupuestos' }
    }
}

/**
 * Obtiene una operación concreta para edición/vista
 */
export async function getOperationById(id: string) {
    try {
        const op = await prisma.operation.findUnique({
            where: { id },
            include: {
                items: true,
                resultCache: true,
                client: true
            }
        })
        return { success: true, data: op }
    } catch (error) {
        console.error('Error fetching operation by ID:', error)
        return { success: false, error: 'Error al cargar el presupuesto' }
    }
}

/**
 * Elimina una operación de la base de datos
 */
export async function deleteOperation(id: string) {
    try {
        await prisma.$transaction([
            prisma.operationCostItem.deleteMany({ where: { operationId: id } }),
            prisma.operationResultCache.deleteMany({ where: { operationId: id } }),
            prisma.operation.delete({ where: { id } })
        ])

        revalidatePath('/')
        revalidatePath('/operations')

        return { success: true }
    } catch (error) {
        console.error('Error deleting operation:', error)
        return { success: false, error: 'Error al eliminar el presupuesto' }
    }
}
