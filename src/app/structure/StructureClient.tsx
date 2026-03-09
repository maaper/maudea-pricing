'use client'

import { useState } from 'react'
import { createStructureCost, updateStructureCost, deleteStructureCost } from '@/app/actions/structureCosts'

type StructureCost = {
    id: string
    name: string
    annualAmount: number
    description: string | null
}

export default function StructureClient({ initialCosts }: { initialCosts: StructureCost[] }) {
    const [costs, setCosts] = useState<StructureCost[]>(initialCosts)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        annualAmount: 0,
        description: ''
    })

    const [isSaving, setIsSaving] = useState(false)

    const openModal = (cost?: StructureCost) => {
        if (cost) {
            setEditingId(cost.id)
            setFormData({
                name: cost.name,
                annualAmount: cost.annualAmount,
                description: cost.description || ''
            })
        } else {
            setEditingId(null)
            setFormData({ name: '', annualAmount: 0, description: '' })
        }
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingId(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            if (editingId) {
                const res = await updateStructureCost(editingId, formData)
                if (res.success && res.data) {
                    setCosts(costs.map(c => c.id === editingId ? res.data as StructureCost : c))
                    closeModal()
                }
            } else {
                const res = await createStructureCost(formData)
                if (res.success && res.data) {
                    setCosts([...costs, res.data as StructureCost])
                    closeModal()
                }
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este registro?')) return

        const res = await deleteStructureCost(id)
        if (res.success) {
            setCosts(costs.filter(c => c.id !== id))
        }
    }

    return (
        <div>
            <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                <h2 className="text-lg font-medium text-zinc-900">Desglose de Partidas</h2>
                <button
                    onClick={() => openModal()}
                    className="inline-flex justify-center rounded-md border border-transparent bg-zinc-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-colors"
                >
                    Añadir Partida
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-white">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Concepto
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Descripción
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Importe Anual
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {costs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-500">
                                    No hay costes de estructura registrados.
                                </td>
                            </tr>
                        ) : (
                            costs.map((cost) => (
                                <tr key={cost.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900">
                                        {cost.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-zinc-500">
                                        {cost.description || <span className="italic opacity-50">Sin descripción</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 text-right font-mono">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cost.annualAmount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openModal(cost)}
                                            className="text-red-600 hover:text-red-900 mr-4"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cost.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-zinc-900 bg-opacity-75 transition-opacity" onClick={closeModal}></div>
                    <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
                        <form onSubmit={handleSubmit}>
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg font-medium leading-6 text-zinc-900 mb-4">
                                    {editingId ? 'Editar Coste de Estructura' : 'Nuevo Coste de Estructura'}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">Nombre de la Partida</label>
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="annualAmount" className="block text-sm font-medium text-zinc-700">Importe Anual Estimado (€)</label>
                                        <input
                                            type="number"
                                            name="annualAmount"
                                            id="annualAmount"
                                            required
                                            step="0.01"
                                            min="0"
                                            value={formData.annualAmount}
                                            onChange={e => setFormData({ ...formData, annualAmount: parseFloat(e.target.value) || 0 })}
                                            className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="description" className="block text-sm font-medium text-zinc-700">Descripción (Opcional)</label>
                                        <textarea
                                            name="description"
                                            id="description"
                                            rows={3}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-zinc-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-emerald-700 px-4 py-2 text-base font-medium text-white shadow-sm hover:focus:ring-2 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {isSaving ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="mt-3 inline-flex w-full justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
