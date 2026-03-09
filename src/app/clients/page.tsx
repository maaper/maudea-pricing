import { getClients } from '@/app/actions/clients'
import { getOperations } from '@/app/actions/operations'
import Link from 'next/link'
import DeleteClientButton from './DeleteClientButton'

export const metadata = {
    title: 'Clientes | NAUDEA Pricing',
}

export default async function ClientsPage() {
    const [clientsRes, opsRes] = await Promise.all([
        getClients(),
        getOperations()
    ])

    const clients = clientsRes.success && clientsRes.data ? clientsRes.data : []
    const operations = opsRes.success && opsRes.data ? opsRes.data : []

    // Calcular métricas por cliente
    const clientStats = clients.map((client: any) => {
        const clientOps = operations.filter((op: any) => op.clientId === client.id)
        const totalVolume = clientOps.reduce((sum: number, op: any) => sum + (op.resultCache?.targetPrice || 0), 0)
        return {
            ...client,
            opsCount: clientOps.length,
            totalVolume
        }
    }).sort((a: any, b: any) => b.totalVolume - a.totalVolume)

    const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Clientes</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Listado y gestión de clientes registrados en el sistema.
                    </p>
                </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-zinc-200 overflow-hidden">
                <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Nombre Cliente</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Operaciones</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Volumen Total</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-zinc-200">
                        {clientStats.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-sm text-zinc-500 italic">
                                    No hay clientes registrados todavía.
                                </td>
                            </tr>
                        ) : clientStats.map((client: any) => (
                            <tr key={client.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-zinc-900">{client.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-600">{client.opsCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-emerald-700">{formatEuro(client.totalVolume)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link href={`/operations?clientId=${client.id}`} className="text-emerald-700 font-bold hover:text-emerald-900 transition-colors">Ver Presupuestos</Link>
                                    <DeleteClientButton id={client.id} name={client.name} opsCount={client.opsCount} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
