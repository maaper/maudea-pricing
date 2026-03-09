'use client'

import { useState } from 'react'
import { createCostComponent, updateCostComponent, deleteCostComponent } from '@/app/actions/costComponents'

type CostComponent = {
    id: string
    name: string
    unitCost: number
    unitType: string
    category: string
}

const CATEGORIES = [
    'Personal',
    'Material',
    'Desplazamiento',
    'Alquiler de Espacios',
    'Servicios Externos',
    'Otros'
]

export default function ComponentsClient({ initialComponents }: { initialComponents: CostComponent[] }) {
    const [components, setComponents] = useState<CostComponent[]>(initialComponents)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        unitCost: 0,
        unitType: 'hora',
        category: 'Personal'
    })

    const [isSaving, setIsSaving] = useState(false)

    const openModal = (comp?: CostComponent) => {
        if (comp) {
            setEditingId(comp.id)
            setFormData({
                name: comp.name,
                unitCost: comp.unitCost,
                unitType: comp.unitType,
                category: comp.category
            })
        } else {
            setEditingId(null)
            setFormData({ name: '', unitCost: 0, unitType: 'hora', category: 'Personal' })
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
                const res = await updateCostComponent(editingId, formData)
                if (res.success && res.data) {
                    setComponents(components.map(c => c.id === editingId ? res.data as CostComponent : c))
                    closeModal()
                } else if (res.error) {
                    alert(res.error)
                }
            } else {
                const res = await createCostComponent(formData)
                if (res.success && res.data) {
                    setComponents([...components, res.data as CostComponent])
                    closeModal()
                } else if (res.error) {
                    alert(res.error)
                }
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este componente?')) return

        const res = await deleteCostComponent(id)
        if (res.success) {
            setComponents(components.filter(c => c.id !== id))
        } else if (res.error) {
            alert(res.error)
        }
    }

    return (
        <div>
            <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
                <h2 className="text-lg font-medium text-zinc-900">Listado de Componentes</h2>
                <button
                    onClick={() => openModal()}
                    className="inline-flex justify-center rounded-md border border-transparent bg-zinc-900 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 transition-colors"
                >
                    Nuevo Componente
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-white">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Nombre
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Categoría
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Coste Unitario
                            </th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {components.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-500">
                                    No hay componentes registrados en la biblioteca.
                                </td>
                            </tr>
                        ) : (
                            components.map((comp) => (
                                <tr key={comp.id} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 flex flex-col">
                                        <span>{comp.name}</span>
                                        <span className="text-xs text-zinc-500 font-normal">por {comp.unitType}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800">
                                            {comp.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 text-right font-mono font-medium">
                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(comp.unitCost)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openModal(comp)}
                                            className="text-red-600 hover:text-red-900 mr-4"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(comp.id)}
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
                                    {editingId ? 'Editar Componente' : 'Nuevo Componente'}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">Nombre del Componente</label>
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
                                        <label htmlFor="category" className="block text-sm font-medium text-zinc-700">Categoría</label>
                                        <select
                                            name="category"
                                            id="category"
                                            required
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3 bg-white"
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="unitCost" className="block text-sm font-medium text-zinc-700">Coste Unitario (€)</label>
                                            <input
                                                type="number"
                                                name="unitCost"
                                                id="unitCost"
                                                required
                                                step="0.01"
                                                min="0"
                                                value={formData.unitCost}
                                                onChange={e => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                                                className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="unitType" className="block text-sm font-medium text-zinc-700">Tipo de Unidad</label>
                                            <input
                                                type="text"
                                                name="unitType"
                                                id="unitType"
                                                placeholder="ej: hora, km, unidad"
                                                required
                                                value={formData.unitType}
                                                onChange={e => setFormData({ ...formData, unitType: e.target.value })}
                                                className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3"
                                            />
                                        </div>
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
