import { getStructureCosts } from '@/app/actions/structureCosts'
import StructureClient from './StructureClient'

export const metadata = {
    title: 'Costes de Estructura | NAUDEA Pricing',
}

export default async function StructurePage() {
    const result = await getStructureCosts()
    const costs = result.success && result.data ? result.data : []

    // Calcular el coste total de estructura
    const totalAnnualCost = costs.reduce((sum, cost) => sum + cost.annualAmount, 0)
    const monthlyCost = totalAnnualCost / 12

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Costes de Estructura</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Gastos fijos anuales que la empresa soporta independientemente de las operaciones.
                        Sirven para calcular el porcentaje de overhead sugerido.
                    </p>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                    <p className="text-sm font-medium text-zinc-500">Total Anualizado</p>
                    <p className="text-3xl font-bold text-zinc-900 mt-2">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalAnnualCost)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                    <p className="text-sm font-medium text-zinc-500">Estimación Mensual</p>
                    <p className="text-3xl font-bold text-zinc-900 mt-2">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(monthlyCost)}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
                <StructureClient initialCosts={costs} />
            </div>
        </div>
    )
}
