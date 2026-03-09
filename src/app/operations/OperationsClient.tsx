'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type OperationWithCache = {
    id: string
    name: string
    type: string
    clientId: string | null
    client: { name: string } | null
    clientName: string | null
    status: string
    updatedAt: Date
    resultCache: {
        targetPrice: number
        netBenefit: number
        expectedMargin: number
    } | null
}

const statusColors: Record<string, string> = {
    DRAFT: 'bg-zinc-100 text-zinc-800 border border-zinc-200',
    APPROVED: 'bg-green-100 text-green-800 border border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border border-red-200',
}

const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
}

export default function OperationsClient({ initialOperations, initialClientId = 'all' }: { initialOperations: OperationWithCache[], initialClientId?: string }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [filterClientId, setFilterClientId] = useState<string>(initialClientId)

    // Obtener lista única de clientes para el filtro
    const clientsList = useMemo(() => {
        const unique: Record<string, string> = {}
        initialOperations.forEach(op => {
            if (op.clientId && (op.client?.name || op.clientName)) {
                unique[op.clientId] = op.client?.name || op.clientName || 'Desconocido'
            }
        })
        return Object.entries(unique).map(([id, name]) => ({ id, name }))
    }, [initialOperations])

    const filteredOperations = useMemo(() => {
        return initialOperations.filter(op => {
            const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (op.clientName && op.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (op.client?.name && op.client?.name.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesClient = filterClientId === 'all' || op.clientId === filterClientId

            return matchesSearch && matchesClient
        })
    }, [initialOperations, searchQuery, filterClientId])

    return (
        <div>
            <div className="p-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between bg-zinc-50 gap-4">
                <div className="flex flex-col md:flex-row gap-4 flex-1 max-w-2xl">
                    <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 pointer-events-none">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-zinc-300 rounded-lg leading-5 bg-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm transition-all"
                        />
                    </div>
                    <select
                        value={filterClientId}
                        onChange={(e) => setFilterClientId(e.target.value)}
                        title="Filtrar por cliente"
                        className="block w-full md:w-48 pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-emerald-600 focus:border-emerald-600 sm:text-sm rounded-lg bg-white border cursor-pointer"
                    >
                        <option value="all">Todos los Clientes</option>
                        {clientsList.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <Link
                    href="/operations/new"
                    className="inline-flex justify-center rounded-md border border-transparent bg-emerald-700 py-2 px-6 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-all"
                >
                    + Nuevo Presupuesto
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-white">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Operación / Cliente
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Precio Objetivo
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Beneficio Neto Libre
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Última Edición
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {filteredOperations.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center text-sm text-zinc-500 italic bg-white">
                                    {initialOperations.length === 0 ? 'No hay presupuestos registrados aún.' : 'No se encontraron presupuestos con esos filtros.'}
                                </td>
                            </tr>
                        ) : (
                            filteredOperations.map((op) => (
                                <tr key={op.id} className="hover:bg-zinc-50 transition-colors cursor-pointer group" onClick={() => window.location.href = `/operations/${op.id}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="group-hover:text-emerald-700 transition-colors">{op.name}</span>
                                                <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-zinc-200">
                                                    {op.type === 'B2B' ? 'B2B' : 'Servicios'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-zinc-500 font-normal mt-0.5 flex items-center gap-1">
                                                <span className="text-zinc-400">👤</span>
                                                {op.client?.name || op.clientName || 'Sin Cliente'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[op.status] || statusColors.DRAFT}`}>
                                            {statusLabels[op.status] || op.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 text-right font-mono font-medium">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(op.resultCache?.targetPrice || 0)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium ${(op.resultCache?.netBenefit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(op.resultCache?.netBenefit || 0)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-zinc-500">
                                        {new Date(op.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
