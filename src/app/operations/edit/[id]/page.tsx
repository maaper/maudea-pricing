import { getOperationById } from '@/app/actions/operations'
import { getCostComponents } from '@/app/actions/costComponents'
import { getSettings } from '@/app/actions/settings'
import WizardClient from '@/app/operations/new/WizardClient'
import { notFound } from 'next/navigation'

export const metadata = {
    title: 'Editar Presupuesto | NAUDEA Pricing',
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditOperationPage({ params }: PageProps) {
    const { id } = await params

    const [compRes, setRes, opRes] = await Promise.all([
        getCostComponents(),
        getSettings(),
        getOperationById(id)
    ])

    if (!opRes.success || !opRes.data) {
        notFound()
    }

    const op = opRes.data
    const libraryComponents = compRes.success && compRes.data ? compRes.data : []
    const settings = setRes.success && setRes.data ? setRes.data : {}

    // Transformar los datos de la DB al formato que espera el Wizard
    const initialData = {
        id: op.id,
        name: op.name,
        type: op.type,
        clientId: op.clientId || undefined,
        clientName: op.clientName || '',
        status: op.status,
        overheadPct: op.overheadPct,
        marginPct: op.marginPct,
        riskPct: op.riskPct,
        items: op.items.map((it: any) => ({
            id: it.id,
            costComponentId: it.costComponentId || undefined,
            name: it.name,
            unitQuantity: it.unitQuantity,
            isCommonCost: it.isCommonCost,
            baseUnitCost: it.baseUnitCost,
            freightCost: it.freightCost,
            insuranceCost: it.insuranceCost,
            customsCost: it.customsCost,
            socialSecurity: it.socialSecurity,
            preventionCost: it.preventionCost,
            rcInsuranceCost: it.rcInsuranceCost,
            otherCosts: it.otherCosts,

            isImport: it.isImport,
            tariffCode: it.tariffCode,
            countryOfOrigin: it.countryOfOrigin,
            tariffPct: it.tariffPct,

            unitCost: it.unitCost
        }))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Editar Presupuesto</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Modifica los parámetros y costes de la operación existente.
                    </p>
                </div>
            </div>

            <WizardClient
                libraryComponents={libraryComponents}
                defaultSettings={settings}
                initialData={initialData}
            />
        </div>
    )
}
