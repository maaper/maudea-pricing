import { getSettings } from '@/app/actions/settings'
import SettingsForm from './SettingsForm'

export const metadata = {
    title: 'Configuración Global | NAUDEA Pricing',
}

export default async function SettingsPage() {
    const result = await getSettings()
    const settings = result.success && result.data ? result.data : {}

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Configuración Global</h1>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
                <div className="mb-6">
                    <h2 className="text-lg font-medium text-zinc-900">Parámetros Financieros Base</h2>
                    <p className="text-sm text-zinc-500">
                        Estos porcentajes se utilizarán por defecto en todos los nuevos presupuestos.
                    </p>
                </div>

                <SettingsForm initialSettings={settings} />
            </div>
        </div>
    )
}
