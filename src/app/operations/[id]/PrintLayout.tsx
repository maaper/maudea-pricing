import React from 'react'

export default function PrintLayout({ op, res, withVAT = false }: { op: any, res: any, withVAT?: boolean }) {
    if (!res) return null

    const VAT = 1.21
    const apv = (v: number) => withVAT ? v * VAT : v

    const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
    const formatPct = (v: number) => (v * 100).toFixed(1) + '%'

    // Only non-common billable items
    let allocations = []
    try { allocations = JSON.parse(res.itemsCalculatedPrices || '[]') } catch { }
    const billable = allocations.filter((a: any) => !a.isCommonCost && a.totalSellingPrice > 0)

    const getItemName = (alloc: any, index: number) => {
        if (alloc.name) return alloc.name
        if (op.items) {
            const tmpMatch = alloc.itemId?.match(/tmp_(\d+)/)
            if (tmpMatch) {
                const idx = parseInt(tmpMatch[1])
                const orderedItems = [...op.items.filter((it: any) => !it.isCommonCost), ...op.items.filter((it: any) => it.isCommonCost)]
                return orderedItems[idx]?.name ?? `Línea ${index + 1}`
            }
            return op.items.find((it: any) => it.id === alloc.itemId)?.name ?? `Línea ${index + 1}`
        }
        return `Línea ${index + 1}`
    }

    return (
        <div className="hidden print:block w-full max-w-[190mm] mx-auto bg-white text-black font-sans box-border print:px-2">
            {/* ENCABEZADO CORPORATIVO */}
            <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                <div className="flex items-center gap-4">
                    <img src="/logo.svg" alt="Naudea Logo" className="w-14 h-14" />
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase mb-1 flex items-center gap-1">
                            NAUDEA <span className="font-light text-zinc-400">PRICING</span>
                        </h1>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {op.type === 'B2B' ? 'REPORTE FINANCIERO: VENTA B2B' : 'REPORTE FINANCIERO: SERVICIOS'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[11px] text-zinc-600 mb-0.5"><span className="font-bold text-zinc-900">REF:</span> {op.id.split('-')[0].toUpperCase()}</p>
                    <p className="text-[11px] text-zinc-600 mb-0.5"><span className="font-bold text-zinc-900">FECHA:</span> {new Date(op.date || op.createdAt).toLocaleDateString('es-ES')}</p>
                    <p className="text-[11px] text-zinc-600"><span className="font-bold text-zinc-900">CLIENTE:</span> {op.client?.name || op.clientName || 'Gral'}</p>
                </div>
            </div>

            {/* TITULO OPERACION */}
            <div className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-900 mb-1">{op.name}</h2>
                <p className="text-xs text-zinc-500 max-w-2xl">
                    Análisis de viabilidad económica, escandallo de costes directos, cálculo de umbrales operativos y estimación de precios comerciales sugeridos para garantizar el cashflow requerido.
                </p>
            </div>

            {/* RESUMEN METRICAS PRINCIPALES (KPIs) */}
            <div className="grid grid-cols-3 gap-0 border-y border-zinc-200 divide-x divide-zinc-200 mb-6 bg-zinc-50">
                <div className="p-4 text-center">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Precio Objetivo Mín.</p>
                    <p className="text-2xl font-mono font-bold text-zinc-900">{formatEuro(res.targetPrice)}</p>
                </div>
                <div className="p-4 text-center bg-white">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">{res.netBenefit >= 0 ? 'Ben. Neto Libre' : 'Pérdida Crítica'}</p>
                    <p className={`text-2xl font-mono font-bold ${res.netBenefit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatEuro(res.netBenefit)}
                    </p>
                </div>
                <div className="p-4 text-center">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Margen Real Disp.</p>
                    <p className="text-2xl font-mono font-bold text-zinc-900">{((res.expectedMargin / res.targetPrice) * 100).toFixed(1)}%</p>
                </div>
            </div>

            {/* LAS 3 FASES DEL COSTE */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* BLOQUE A: COSTE OPERATIVO */}
                <div className="border border-zinc-300 p-3 bg-zinc-50/50">
                    <h3 className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest border-b border-zinc-200 pb-2 mb-2 flex items-center justify-between">
                        <span>Fase 1: Coste OP.</span>
                        <span className="text-zinc-400">A</span>
                    </h3>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-600">A. Cst. Directo</span>
                            <span className="font-mono font-bold">{formatEuro(res.totalDirectCost)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-600">B. Estructura ({formatPct(op.overheadPct)})</span>
                            <span className="font-mono">{formatEuro(res.totalOverheadCost)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-zinc-600">C. Riesgo ({formatPct(op.riskPct)})</span>
                            <span className="font-mono">{formatEuro(res.totalCost - res.totalDirectCost - res.totalOverheadCost)}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1.5 border-t border-zinc-300">
                            <span className="font-bold text-black uppercase">Coste Base</span>
                            <span className="font-mono font-black">{formatEuro(res.totalCost)}</span>
                        </div>
                    </div>
                </div>

                {/* BLOQUE B: MARGEN BRUTO */}
                <div className="border border-zinc-300 p-3 bg-white">
                    <h3 className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest border-b border-zinc-200 pb-2 mb-2 flex items-center justify-between">
                        <span>Fase 2: Retorno</span>
                        <span className="text-zinc-400">B</span>
                    </h3>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-600">Coste Total</span>
                            <span className="font-mono font-bold">{formatEuro(res.totalCost)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] mb-1 text-emerald-700">
                            <span className="font-bold">+ Margen ({formatPct(op.marginPct)})</span>
                            <span className="font-mono font-bold">+{formatEuro(res.expectedBenefit)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-400 italic leading-tight pb-1">
                            <span>Mgn Bruto Garantizado.</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1.5 border-t border-zinc-300 bg-zinc-100 px-1 -mx-1 -mb-1 pb-1">
                            <span className="font-bold text-black uppercase">Pr. Venta</span>
                            <span className="font-mono font-black">{formatEuro(res.targetPrice)}</span>
                        </div>
                    </div>
                </div>

                {/* BLOQUE C: REALIDAD FISCAL */}
                <div className="border border-zinc-800 p-3 bg-zinc-900 text-white">
                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest border-b border-zinc-700 pb-2 mb-2 flex items-center justify-between">
                        <span>Fase 3: Caja Libre</span>
                        <span className="text-zinc-500">C</span>
                    </h3>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                            <span className="text-zinc-300">Mg. Op. Bruto</span>
                            <span className="font-mono">{formatEuro(res.expectedBenefit)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-red-300">
                            <span>- Impuestos (25%)</span>
                            <span className="font-mono">-{formatEuro(res.isTax)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-amber-300 mb-1">
                            <span>- R. Legal (20%)</span>
                            <span className="font-mono">-{formatEuro(res.legalReserve)}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1.5 border-t border-zinc-600">
                            <span className="font-bold text-emerald-400 uppercase tracking-tighter">Ben. Neto 60%</span>
                            <span className="font-mono font-black text-emerald-400">{formatEuro(res.netBenefit)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLA ESCANDALLO DETALLE */}
            <div className="mb-6 break-inside-avoid">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-2 flex items-center border-b border-black pb-1">
                    [1] Detalle Análisis de Costes (Escandallo)
                </h3>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-300">
                            <th className="py-1.5 text-[9px] font-bold text-zinc-500 uppercase w-1/2">Descripción Concepto</th>
                            <th className="py-1.5 text-[9px] font-bold text-zinc-500 uppercase text-center w-1/6">Tipo</th>
                            <th className="py-1.5 text-[9px] font-bold text-zinc-500 uppercase text-right w-1/6">Uds × Cst</th>
                            <th className="py-1.5 text-[9px] font-bold text-zinc-900 uppercase text-right w-1/6">Coste Bruto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {op.items.map((it: any) => (
                            <tr key={it.id} className="text-[11px]">
                                <td className="py-2.5 pr-2">
                                    <span className={`font-bold ${it.isCommonCost ? 'text-zinc-600 italic' : 'text-zinc-900'}`}>{it.name}</span>
                                    {it.isImport && (
                                        <div className="mt-0.5 flex flex-col gap-0.5">
                                            <span className="text-[9px] text-zinc-500 uppercase">
                                                Importación (Arancel: {it.tariffPct || 0}%)
                                            </span>
                                            {it.tariffCode && (
                                                <span className="text-[9px] text-zinc-500 uppercase">
                                                    TARIC: {it.tariffCode} {it.tariffDescription ? `- ${it.tariffDescription}` : ''}
                                                </span>
                                            )}
                                            <span className="text-[9px] text-zinc-500">
                                                Desglose: {it.originalCurrency && it.originalCurrency !== 'EUR' ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: it.originalCurrency }).format((it.originalCost || 0) * it.unitQuantity)} ➔ ` : ''}
                                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(it.unitCost * it.unitQuantity)} + Arancel {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((it.unitCost * it.unitQuantity) * ((it.tariffPct || 0) / 100))}
                                            </span>
                                        </div>
                                    )}
                                    {!it.isImport && it.originalCurrency && it.originalCurrency !== 'EUR' && (
                                        <span className="block text-[9px] text-zinc-500 mt-0.5 uppercase">Referencia orig: {it.originalCost} {it.originalCurrency} (Tasa: {it.exchangeRate.toFixed(4)})</span>
                                    )}
                                </td>
                                <td className="py-2.5 text-center text-[9px] uppercase tracking-wider text-zinc-400 font-medium">
                                    {it.isCommonCost ? 'Común' : 'Directo'}
                                </td>
                                <td className="py-2.5 text-right font-mono text-zinc-600">
                                    {it.unitQuantity} × {formatEuro(it.unitCost)}
                                </td>
                                <td className="py-2.5 text-right font-mono font-bold text-zinc-900">
                                    {formatEuro(it.totalCost)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-black">
                            <td colSpan={3} className="py-2 text-right text-[10px] font-bold uppercase tracking-widest">SUBTOTAL COSTES:</td>
                            <td className="py-2 text-right font-mono font-black text-sm">{formatEuro(res.totalDirectCost)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* TABLA PRECIOS ASIGNADOS */}
            {
                billable.length > 0 && (
                    <div className="break-inside-avoid print:mt-16">
                        <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-2 flex items-center border-b border-black pb-1">
                            [2] Precios de Venta Comerciales Sugeridos {withVAT ? '(IVA 21% INCLUIDO)' : ''}
                        </h3>
                        <table className="w-full text-left border-collapse border border-zinc-200">
                            <thead className="bg-zinc-100">
                                <tr>
                                    <th className="py-2 px-3 text-[9px] font-bold text-zinc-700 uppercase">Concepto Facturable</th>
                                    <th className="py-2 px-3 text-[9px] font-bold text-zinc-700 uppercase text-right border-l border-zinc-200">Uds</th>
                                    <th className="py-2 px-3 text-[9px] font-bold text-zinc-700 uppercase text-right border-l border-zinc-200">PVP Base Unit.</th>
                                    <th className="py-2 px-3 text-[9px] font-black text-black uppercase text-right border-l border-zinc-200 bg-zinc-200">PVP Total Sugerido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200">
                                {billable.map((alloc: any, i: number) => (
                                    <tr key={i} className="text-[11px]">
                                        <td className="py-2.5 px-3 font-bold text-zinc-900">{getItemName(alloc, i)}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-zinc-600 border-l border-zinc-100">{alloc.unitQuantity ?? '—'}</td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-800 border-l border-zinc-100">{formatEuro(apv(alloc.unitSellingPrice))}</td>
                                        <td className="py-2.5 px-3 text-right font-mono font-black text-black bg-zinc-50 border-l border-zinc-200">{formatEuro(apv(alloc.totalSellingPrice))}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-black bg-zinc-50">
                                    <td colSpan={3} className="py-3 px-3 text-right text-[10px] font-black uppercase tracking-widest text-black">TOTAL PRECIO OBJETIVO {withVAT ? '(CON IVA)' : ''}:</td>
                                    <td className="py-3 px-3 text-right font-mono font-black text-lg text-black">{formatEuro(apv(res.targetPrice))}</td>
                                </tr>
                            </tfoot>
                        </table>
                        {!withVAT && (
                            <p className="text-[9px] text-zinc-400 uppercase tracking-wider mt-2 px-1">* Los precios indicados en esta tabla no incluyen Impuestos Indirectos (IVA/IGIC).</p>
                        )}
                    </div>
                )
            }

            {/* AI CONTROLLER REASONING */}
            {
                op.aiSuggestedReasoning && (
                    <div className="mt-8 border-t-2 border-black pt-4 break-inside-avoid">
                        <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-2 flex items-center gap-2">
                            Razonamiento Controller Financiero IA
                        </h3>
                        <div className="text-[9px] text-zinc-700 leading-relaxed pl-4 border-l-2 border-zinc-300">
                            {op.aiSuggestedReasoning.split('\n').filter((l: string) => l.trim().length > 0).map((line: string, i: number) => (
                                <p key={i} className={line.startsWith('-') || line.startsWith('*') ? 'mb-1 relative before:content-["•"] before:absolute before:-left-3' : 'mb-1 font-bold text-black'}>
                                    {line.replace(/^[-*]\s*/, '')}
                                </p>
                            ))}
                        </div>
                    </div>
                )
            }
        </div >
    )
}
