import { getCostComponents } from '@/app/actions/costComponents'
import ComponentsClient from './ComponentsClient'

export const metadata = {
    title: 'Biblioteca de Componentes | NAUDEA Pricing',
}

export default async function CostComponentsPage() {
    const result = await getCostComponents()
    const components = result.success && result.data ? result.data : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Biblioteca base de Componentes</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Gestión de precios unitarios estandarizados (personal, materiales, desplazamientos) para conformar presupuestos.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
                <ComponentsClient initialComponents={components} />
            </div>
        </div>
    )
}
