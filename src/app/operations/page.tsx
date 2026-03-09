import { getOperations } from '@/app/actions/operations'
import OperationsClient from './OperationsClient'

export const metadata = {
    title: 'Presupuestos | NAUDEA Pricing',
}

export default async function OperationsPage({ searchParams }: { searchParams?: { clientId?: string } }) {
    const result = await getOperations()
    const operations = result.success && result.data ? result.data : []
    const sp = await searchParams;
    const initialClientId = sp?.clientId || 'all'

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Historial de Operaciones</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Gestión de presupuestos, estimaciones de rentabilidad y cotizaciones a clientes.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
                <OperationsClient initialOperations={operations} initialClientId={initialClientId} />
            </div>
        </div>
    )
}
