import { getCostComponents } from '@/app/actions/costComponents'
import { getSettings } from '@/app/actions/settings'
import WizardClient from './WizardClient'

export const metadata = {
    title: 'Nuevo Presupuesto | NAUDEA Pricing',
}

export default async function NewOperationPage() {
    const [compRes, setRes] = await Promise.all([
        getCostComponents(),
        getSettings()
    ])

    const libraryComponents = compRes.success && compRes.data ? compRes.data : []
    const settings = setRes.success && setRes.data ? setRes.data : {}

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Configurador de Presupuesto</h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Asistente paso a paso para calcular un nuevo precio de venta garantizando la rentabilidad.
                    </p>
                </div>
            </div>

            <WizardClient
                libraryComponents={libraryComponents}
                defaultSettings={settings}
            />
        </div>
    )
}
