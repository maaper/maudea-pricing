import { getStructureCosts } from '@/app/actions/structureCosts'
import { getOperations } from '@/app/actions/operations'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard | NAUDEA Pricing',
}

export default async function DashboardPage() {
  const [costsRes, opsRes] = await Promise.all([
    getStructureCosts(),
    getOperations()
  ])

  const structureCosts = costsRes.success && costsRes.data ? costsRes.data : []
  const operations = opsRes.success && opsRes.data ? opsRes.data : []

  // Calcular KPIs
  const totalAnnualCost = structureCosts.reduce((sum, cost) => sum + cost.annualAmount, 0)

  // Solo operaciones que están aprobadas o finalizadas para calcular beneficio real (aquí asumimos todas en este MVP)
  const totalBeneficio = operations.reduce((sum, op) => sum + (op.resultCache?.netBenefit || 0), 0)

  // Rentabilidad sobre el volumen (Average Margin)
  const totalFacturacion = operations.reduce((sum, op) => sum + (op.resultCache?.targetPrice || 0), 0)
  const avgMargin = totalFacturacion > 0 ? (totalBeneficio / totalFacturacion) * 100 : 0

  // Formatters
  const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
  const formatPct = (v: number) => new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(v / 100)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Visión global del estado financiero y operaciones comerciales de la empresa.
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

        {/* KPI 1: Costes Estructura */}
        <div className="bg-white overflow-hidden rounded-lg shadow-sm border border-zinc-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <svg className="h-6 w-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-zinc-500 truncate">Estructura Anual Incurrible</dt>
                  <dd className="text-2xl font-bold text-zinc-900">{formatEuro(totalAnnualCost)}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 px-5 py-3">
            <div className="text-sm"><Link href="/structure" className="font-medium text-red-600 hover:text-red-900">Ver desglose</Link></div>
          </div>
        </div>

        {/* KPI 2: Operaciones */}
        <div className="bg-white overflow-hidden rounded-lg shadow-sm border border-zinc-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-zinc-500 truncate">Operaciones Cotizadas</dt>
                  <dd className="text-2xl font-bold text-zinc-900">{operations.length}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 px-5 py-3">
            <div className="text-sm"><Link href="/operations" className="font-medium text-blue-600 hover:text-blue-900">Ver historial</Link></div>
          </div>
        </div>

        {/* KPI 3: Beneficio Neto */}
        <div className="bg-white overflow-hidden rounded-lg shadow-sm border border-zinc-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-zinc-500 truncate">Caja Libre Estimada</dt>
                  <dd className={`text-2xl font-bold ${totalBeneficio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatEuro(totalBeneficio)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 px-5 py-3">
            <div className="text-sm text-zinc-500">Beneficio Neto Acumulado</div>
          </div>
        </div>

        {/* KPI 4: Rentabilidad */}
        <div className="bg-white overflow-hidden rounded-lg shadow-sm border border-zinc-200">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-zinc-500 truncate">Rentabilidad Media</dt>
                  <dd className="text-2xl font-bold text-zinc-900">{formatPct(avgMargin)}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 px-5 py-3">
            <div className="text-sm text-zinc-500">Volumen Venta: {formatEuro(totalFacturacion)}</div>
          </div>
        </div>
      </div>

      {/* Recientes */}
      <div className="bg-white shadow-sm rounded-lg border border-zinc-200">
        <div className="px-6 py-5 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-zinc-900">Operaciones Recientes</h3>
          <Link href="/operations/new" className="text-sm text-red-600 hover:text-red-900 font-medium">
            + Crear Nuevo
          </Link>
        </div>
        <div className="divide-y divide-zinc-200">
          {operations.slice(0, 5).map(op => (
            <div key={op.id} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
              <div className="flex items-center">
                <div className={`h-2.5 w-2.5 rounded-full mr-3 ${op.status === 'APPROVED' ? 'bg-green-500' : op.status === 'REJECTED' ? 'bg-red-500' : 'bg-zinc-300'}`}></div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{op.name}</p>
                  <p className="text-xs text-zinc-500">{op.clientName || 'Cliente No Asignado'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-zinc-900 font-mono">{formatEuro(op.resultCache?.targetPrice || 0)}</p>
                <p className="text-xs text-zinc-500">Neto: {formatEuro(op.resultCache?.netBenefit || 0)}</p>
              </div>
            </div>
          ))}
          {operations.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-zinc-500">
              Todavía no has creado ningún presupuesto. ¡Anímate a crear el primero!
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
