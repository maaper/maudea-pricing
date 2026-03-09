'use client'

import { useState } from 'react'
import Link from 'next/link'
import PricingTable from './PricingTable'
import DeleteOperationButton from './DeleteOperationButton'
import PrintButton from './PrintButton'
import PrintLayout from './PrintLayout'

export default function OperationDetailClient({ op, res }: { op: any, res: any }) {
    const [withVAT, setWithVAT] = useState(false)
    const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

    return (
        <>
            <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 print:hidden">
                <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-zinc-200 mt-6">
                    <div>
                        <div className="flex items-center space-x-3 text-sm text-zinc-500 mb-2">
                            <Link href="/operations" className="hover:text-emerald-700 transition">← Volver al Listado</Link>
                            <span>/</span>
                            <span className="font-mono text-xs">{op.id}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">{op.name}</h1>
                            <span className="bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-zinc-200 flex items-center gap-1.5 shadow-sm">
                                {op.type === 'B2B' ? '🏢 Venta B2B' : '👨‍🔧 Servicios'}
                            </span>
                        </div>
                        <p className="text-zinc-600 font-medium flex items-center gap-1.5">
                            <span className="text-zinc-400">👤</span>
                            {/* @ts-ignore */}
                            {op.client?.name || op.clientName || 'Cliente No Especificado'}
                        </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide
                        ${op.status === 'APPROVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                                op.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' :
                                    'bg-zinc-100 text-zinc-800 border border-zinc-200'}`}>
                            {op.status === 'DRAFT' ? 'Borrador' : op.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}
                        </span>
                        <p className="text-xs text-zinc-500 mt-3 font-medium">Última mod: {new Date(op.updatedAt).toLocaleDateString('es-ES')}</p>
                    </div>
                </div>

                {/* FINANCIAL SUMMARY CARDS */}
                {res && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                            <h3 className="text-sm font-bold uppercase text-zinc-500 mb-1 tracking-wider">Precio Objetivo Mín.</h3>
                            <p className="text-3xl font-black font-mono text-emerald-600">{formatEuro(res.targetPrice)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                            <h3 className="text-sm font-bold uppercase text-zinc-500 mb-1 tracking-wider">Ben. Neto Real Libre</h3>
                            <p className={`text-3xl font-black font-mono ${res.netBenefit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatEuro(res.netBenefit)}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                            <h3 className="text-sm font-bold uppercase text-zinc-500 mb-1 tracking-wider">Margen Estimado</h3>
                            <p className="text-3xl font-black font-mono text-zinc-900">
                                {((res.expectedMargin / res.targetPrice) * 100).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                )}

                {/* RESUMEN FINANCIERO — 3 bloques en horizontal, igual que en el wizard */}
                {res && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* BLOQUE 1: COSTES */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-zinc-200 relative">
                            <div className="absolute -top-3 -left-3 bg-zinc-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
                            <h3 className="text-sm font-bold uppercase text-zinc-900 mb-4 tracking-wider ml-4">Coste Operativo Real</h3>
                            <p className="text-xs text-zinc-500 mb-4 ml-4">Las 3 capas de coste de tu operación.</p>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-700 font-bold">A) Coste Directo</span>
                                        <span className="font-mono text-zinc-900">{formatEuro(res.totalDirectCost)}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-0.5">Lo que cuesta hacer el servicio o producto.</p>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-700 font-bold">B) Estructura ({(op.overheadPct * 100).toFixed(1)}%)</span>
                                        <span className="font-mono text-zinc-900">{formatEuro(res.totalOverheadCost)}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-0.5">Lo que existe aunque no factures.</p>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-700 font-bold">C) Riesgo ({(op.riskPct * 100).toFixed(1)}%)</span>
                                        <span className="font-mono text-zinc-900">{formatEuro(res.totalCost - res.totalDirectCost - res.totalOverheadCost)}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-0.5">Tu colchón de supervivencia (imprevistos).</p>
                                </div>
                                <div className="pt-4 border-t-2 border-zinc-900 flex justify-between text-base">
                                    <span className="text-zinc-900 font-black uppercase">Coste Total</span>
                                    <span className="font-mono text-zinc-900 font-black">{formatEuro(res.totalCost)}</span>
                                </div>
                            </div>
                        </div>

                        {/* BLOQUE 2: MARGEN Y PRECIO */}
                        <div className="bg-emerald-50 p-6 rounded-lg shadow-sm border-2 border-emerald-200 relative">
                            <div className="absolute -top-3 -left-3 bg-emerald-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
                            <h3 className="text-sm font-bold uppercase text-emerald-900 mb-4 tracking-wider ml-4">Fijación de Precio</h3>
                            <p className="text-xs text-emerald-700 mb-4 ml-4">Aplicando tu margen comercial del {(op.marginPct * 100).toFixed(1)}%.</p>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-emerald-900 font-medium">Coste Operativo Total</span>
                                    <span className="font-mono text-emerald-900">{formatEuro(res.totalCost)}</span>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-emerald-900 font-black">+ Margen Operativo Bruto</span>
                                        <span className="font-mono text-emerald-900 font-bold">{formatEuro(res.expectedBenefit)}</span>
                                    </div>
                                    <p className="text-xs text-emerald-700">Beneficio bruto garantizado sobre la venta.</p>
                                </div>
                                <div className="pt-4 border-t-2 border-emerald-900 flex flex-col justify-center items-center text-center">
                                    <span className="text-emerald-900 font-black uppercase text-xs tracking-widest mb-1">Precio Objetivo Mínimo</span>
                                    <span className="font-mono text-emerald-700 font-black text-4xl">{formatEuro(res.targetPrice)}</span>
                                </div>
                            </div>
                        </div>

                        {/* BLOQUE 3: REALIDAD FISCAL */}
                        <div className="bg-zinc-900 text-white p-6 rounded-lg shadow-sm border-2 border-black relative">
                            <div className="absolute -top-3 -left-3 bg-white text-black w-8 h-8 rounded-full flex items-center justify-center font-bold">3</div>
                            <h3 className="text-sm font-bold uppercase text-zinc-100 mb-4 tracking-wider ml-4">Realidad: El 60% Real</h3>
                            <p className="text-xs text-zinc-400 mb-4 ml-4">De tu margen bruto, solo te quedas el 60% real tras obligaciones.</p>
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-300 font-medium">Margen Operativo Bruto</span>
                                    <span className="font-mono text-zinc-100">{formatEuro(res.expectedBenefit)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-300">
                                    <span className="font-medium">- 25% Impuesto Soc.</span>
                                    <span className="font-mono font-bold">-{formatEuro(res.isTax)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-yellow-300">
                                    <span className="font-medium">- 20% Reserva Legal</span>
                                    <span className="font-mono font-bold">-{formatEuro(res.legalReserve)}</span>
                                </div>
                                <div className="pt-4 border-t-2 border-zinc-700 flex flex-col items-center">
                                    <span className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-1">Caja Libre (Beneficio Neto)</span>
                                    <span className="font-mono text-emerald-400 font-black text-3xl">{formatEuro(res.netBenefit)}</span>
                                </div>
                                {res.netBenefit < 0 && (
                                    <div className="mt-2 bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-xs">
                                        <strong>⚠️ Riesgo Crítico:</strong> Pérdidas reales de liquidez. Aumenta el Margen Comercial.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* DETALLE ESCANDALLO — ancho completo debajo de los bloques */}
                <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
                    <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200">
                        <h2 className="text-lg font-bold text-zinc-900">Detalle Escandallo</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Costes directos de cada concepto + costes comunes de la operación.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Concepto</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Uds × Coste Unit.</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase">Coste Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {[...op.items].sort((a: any, b: any) => (a.isCommonCost === b.isCommonCost ? 0 : a.isCommonCost ? 1 : -1)).map((item: any) => (
                                    <tr key={item.id} className="hover:bg-zinc-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                                                {item.isCommonCost && (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${item.name.startsWith('C. Transporte y Seguro Internacional') || item.name.startsWith('C. Aranceles de Importación')
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                        : 'bg-amber-100 text-amber-800 border-amber-200'
                                                        }`}>
                                                        {item.name.startsWith('C. Transporte') || item.name.startsWith('C. Aranceles') ? 'Automático' : 'Coste Común'}
                                                    </span>
                                                )}
                                            </div>
                                            {item.isImport && (
                                                <div className="mt-1 flex flex-col gap-0.5">
                                                    <span className="text-[10px] text-zinc-500">
                                                        Importación (Arancel: {item.tariffPct || 0}%)
                                                    </span>
                                                    {item.tariffCode && (
                                                        <span className="text-[10px] text-zinc-500">
                                                            TARIC: {item.tariffCode} {item.tariffDescription ? `- ${item.tariffDescription}` : ''}
                                                        </span>
                                                    )}
                                                    <div className="text-[10px] text-blue-600 font-medium">
                                                        Desglose: {item.originalCurrency && item.originalCurrency !== 'EUR' ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: item.originalCurrency }).format((item.originalCost || 0) * item.unitQuantity)} ➔ ` : ''}
                                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.unitCost * item.unitQuantity)} + Arancel {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((item.unitCost * item.unitQuantity) * ((item.tariffPct || 0) / 100))}
                                                    </div>
                                                </div>
                                            )}
                                            {(item.freightCost > 0 || item.insuranceCost > 0 || item.customsCost > 0) && (
                                                <p className="text-xs text-zinc-500 mt-1">Incluye extras (+{formatEuro(item.unitCost - item.baseUnitCost)}/ud)</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-600 text-right">{item.unitQuantity} × {formatEuro(item.unitCost)}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right font-mono">{formatEuro(item.totalCost)}</td>
                                    </tr>
                                ))}
                                {res && (
                                    <tr className="bg-zinc-50 border-t-2 border-zinc-200">
                                        <td colSpan={2} className="px-6 py-4 text-sm font-bold text-zinc-900 text-right uppercase tracking-wider">Total Costes Directos:</td>
                                        <td className="px-6 py-4 text-lg font-black text-emerald-600 text-right font-mono">{formatEuro(res.totalDirectCost)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI CONTROLLER REASONING */}
                {op.aiSuggestedReasoning && (
                    <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-lg shadow-sm border border-zinc-950 overflow-hidden mb-6">
                        <div className="px-6 py-4 border-b border-zinc-700 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">AI</span>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Razonamiento Controller Financiero</h3>
                                <p className="text-xs text-zinc-400">Argumentario técnico para defender la propuesta comercial.</p>
                            </div>
                        </div>
                        <div className="p-6 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {op.aiSuggestedReasoning.split('\n').filter((l: string) => l.trim().length > 0).map((line: string, i: number) => (
                                <p key={i} className={line.startsWith('-') || line.startsWith('*') ? 'pl-4 mb-2 relative before:content-["•"] before:absolute before:left-0 before:text-emerald-500' : 'mb-3 font-medium text-white'}>
                                    {line.replace(/^[-*]\s*/, '')}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* PRECIOS DE VENTA FINALES ASIGNADOS */}
                {res && res.itemsCalculatedPrices && (
                    <PricingTable
                        itemsCalculatedPricesJson={res.itemsCalculatedPrices}
                        items={op.items.map((it: any) => ({ id: it.id, name: it.name, isCommonCost: it.isCommonCost }))}
                        totalTargetPrice={res.targetPrice}
                        withVAT={withVAT}
                        setWithVAT={setWithVAT}
                    />
                )}

                {/* BOTONES ACCION (Footer) */}
                <div className="flex justify-end pt-4 gap-4 mt-6">
                    <Link
                        href="/operations"
                        className="inline-flex justify-center rounded-md border border-zinc-300 bg-white py-2 px-6 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors"
                    >
                        Volver
                    </Link>
                    <PrintButton />
                    <Link
                        href={`/operations/edit/${op.id}`}
                        className="inline-flex justify-center rounded-md border border-transparent bg-zinc-900 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 transition-colors"
                    >
                        Editar Presupuesto
                    </Link>
                    <DeleteOperationButton id={op.id} />
                </div>
            </div>
            {/* The Print Layout reacting to state */}
            <PrintLayout op={op} res={res} withVAT={withVAT} />
        </>
    )
}
