'use client'

import { useState } from 'react'
import { updateSettings } from '@/app/actions/settings'

export default function SettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
    const [formData, setFormData] = useState({
        legal_reserve_pct: parseFloat(initialSettings.legal_reserve_pct || '0.20') * 100,
        corporate_tax_pct: parseFloat(initialSettings.corporate_tax_pct || '0.25') * 100,
        default_risk_pct: parseFloat(initialSettings.default_risk_pct || '0.00') * 100,
        default_margin_pct: parseFloat(initialSettings.default_margin_pct || '0.20') * 100,
    })

    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        setMessage({ type: '', text: '' })

        const inputs = [
            { key: 'legal_reserve_pct', value: (formData.legal_reserve_pct / 100).toString() },
            { key: 'corporate_tax_pct', value: (formData.corporate_tax_pct / 100).toString() },
            { key: 'default_risk_pct', value: (formData.default_risk_pct / 100).toString() },
            { key: 'default_margin_pct', value: (formData.default_margin_pct / 100).toString() },
        ]

        const result = await updateSettings(inputs)

        setIsSaving(false)
        if (result.success) {
            setMessage({ type: 'success', text: 'Configuración actualizada correctamente.' })
        } else {
            setMessage({ type: 'error', text: result.error || 'Error al guardar.' })
        }

        // Auto clear message
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: parseFloat(value) || 0
        }))
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">

                <div>
                    <label htmlFor="corporate_tax_pct" className="block text-sm font-medium text-zinc-700">
                        Impuesto de Sociedades (%)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="number"
                            step="0.01"
                            id="corporate_tax_pct"
                            name="corporate_tax_pct"
                            value={formData.corporate_tax_pct}
                            onChange={handleChange}
                            className="text-zinc-900 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-zinc-500 sm:text-sm">%</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="legal_reserve_pct" className="block text-sm font-medium text-zinc-700">
                        Reserva Legal Obligatoria (%)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="number"
                            step="0.01"
                            id="legal_reserve_pct"
                            name="legal_reserve_pct"
                            value={formData.legal_reserve_pct}
                            onChange={handleChange}
                            className="text-zinc-900 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-zinc-500 sm:text-sm">%</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="default_margin_pct" className="block text-sm font-medium text-zinc-700">
                        Margen Estándar Esperado (%)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="number"
                            step="0.01"
                            id="default_margin_pct"
                            name="default_margin_pct"
                            value={formData.default_margin_pct}
                            onChange={handleChange}
                            className="text-zinc-900 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-zinc-500 sm:text-sm">%</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="default_risk_pct" className="block text-sm font-medium text-zinc-700">
                        Riesgo Estándar (%)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="number"
                            step="0.01"
                            id="default_risk_pct"
                            name="default_risk_pct"
                            value={formData.default_risk_pct}
                            onChange={handleChange}
                            className="text-zinc-900 block w-full rounded-md border-zinc-300 py-2 pl-3 pr-10 focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-zinc-500 sm:text-sm">%</span>
                        </div>
                    </div>
                </div>

            </div>

            <div className="pt-4 flex items-center gap-4">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex justify-center rounded-md border border-transparent bg-emerald-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:focus:ring-2 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>

                {message.text && (
                    <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message.text}
                    </span>
                )}
            </div>
        </form>
    )
}
