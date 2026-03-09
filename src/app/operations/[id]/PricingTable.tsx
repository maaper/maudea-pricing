'use client'

import { useState } from 'react'

const VAT = 1.21

// Formato enriquecido que se guarda desde operations.ts (incluye name e isCommonCost)
type Allocation = {
    itemId: string
    name: string
    isCommonCost: boolean
    unitQuantity?: number
    unitSellingPrice: number
    totalSellingPrice: number
}

export default function PricingTable({
    itemsCalculatedPricesJson,
    totalTargetPrice,
    items,
    withVAT,
    setWithVAT
}: {
    itemsCalculatedPricesJson: string
    totalTargetPrice: number
    items?: { id: string; name: string; isCommonCost: boolean }[]
    withVAT: boolean
    setWithVAT: (v: boolean | ((old: boolean) => boolean)) => void
}) {
    const fmt = (v: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
    const apv = (v: number) => withVAT ? v * VAT : v

    let allocations: Allocation[] = []
    try { allocations = JSON.parse(itemsCalculatedPricesJson) } catch { return null }

    // Soporte para datos legacy (sin 'name' en el JSON): resolver nombre desde el array items o por índice
    const getItemName = (alloc: Allocation, index: number): string => {
        if (alloc.name) return alloc.name
        // Datos legacy: itemId puede ser "tmp_0", "tmp_1", o UUID real
        if (items) {
            // Intentar por número de índice en tmp_X
            const tmpMatch = alloc.itemId?.match(/tmp_(\d+)/)
            if (tmpMatch) {
                const idx = parseInt(tmpMatch[1])
                // Los items de la DB pueden estar en distinto orden que cuando se crearon;
                // usamos el orden de no-comunes primero para hacer un best-effort
                const nonCommon = items.filter(it => !it.isCommonCost)
                const common = items.filter(it => it.isCommonCost)
                const orderedItems = [...nonCommon, ...common]
                return orderedItems[idx]?.name ?? `Artículo ${index + 1}`
            }
            // Fallback por UUID
            return items.find(it => it.id === alloc.itemId)?.name ?? `Artículo ${index + 1}`
        }
        return `Artículo ${index + 1}`
    }

    // Solo conceptos facturables (no costes comunes, no precio 0)
    const billable = allocations.filter(a => !a.isCommonCost && a.totalSellingPrice > 0)

    if (billable.length === 0) return null

    return (
        <div className="mt-8 bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden print:shadow-none print:break-inside-avoid print:mt-4 print:border-none">
            {/* Cabecera — idéntica al wizard Step 4 */}
            <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-white print:px-0 print:py-2 print:border-b-2">
                <div>
                    <h3 className="text-lg font-bold text-zinc-900">Precios de Venta Sugeridos</h3>
                    <p className="text-xs text-zinc-500">Reparto ponderado del Precio Objetivo Mínimo entre los conceptos facturables.</p>
                </div>
                {/* Toggle IVA — idéntico al wizard */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm print:hidden">
                    <span className={`text-xs font-bold ${!withVAT ? 'text-zinc-900' : 'text-zinc-400'}`}>SIN IVA</span>
                    <button
                        type="button"
                        aria-label="Cambiar IVA"
                        onClick={() => setWithVAT(v => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${withVAT ? 'bg-emerald-600' : 'bg-zinc-300'}`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${withVAT ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-xs font-bold ${withVAT ? 'text-zinc-900' : 'text-zinc-400'}`}>CON IVA (21%)</span>
                </div>
            </div>

            <div className="overflow-x-auto mt-0">
                <table className="min-w-full divide-y divide-zinc-200 print:text-sm">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Concepto Facturable</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Uds.</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border-l border-emerald-100">PVP Unitario</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50">Total Línea</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {billable.map((alloc, i) => (
                            <tr key={`${alloc.itemId}-${i}`} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-zinc-900">{getItemName(alloc, i)}</td>
                                <td className="px-6 py-4 text-sm text-zinc-500 text-right">{alloc.unitQuantity ?? '—'}</td>
                                <td className="px-6 py-4 text-sm font-bold text-emerald-700 text-right font-mono bg-emerald-50/30 border-l border-emerald-50">
                                    {fmt(apv(alloc.unitSellingPrice))}
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-emerald-900 text-right font-mono bg-emerald-50/50">
                                    {fmt(apv(alloc.totalSellingPrice))}
                                </td>
                            </tr>
                        ))}
                        {/* Fila total */}
                        <tr className="bg-zinc-900">
                            <td colSpan={2} className="px-6 py-4 text-sm font-black text-white uppercase tracking-wider text-right">
                                Total Presupuesto {withVAT ? '(CON IVA)' : '(SIN IVA)'}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-zinc-400 text-sm">—</td>
                            <td className="px-6 py-4 text-right font-mono font-black text-emerald-400 text-xl">
                                {fmt(apv(totalTargetPrice))}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
