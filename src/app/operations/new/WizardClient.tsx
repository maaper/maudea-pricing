'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClients, createClient } from '@/app/actions/clients'
import { getExchangeRate } from '@/app/actions/currency'
import { saveOperation, SaveOperationInput } from '@/app/actions/operations'
import { calculateOperationPrices } from '@/lib/calculator'
import { allocateTargetPriceToItems } from '@/lib/pricing_allocator'

type CostComponent = {
    id: string
    name: string
    unitCost: number
    unitType: string
    category: string
}

type Client = {
    id: string
    name: string
}

export default function WizardClient({
    libraryComponents,
    defaultSettings,
    initialData
}: {
    libraryComponents: CostComponent[],
    defaultSettings: Record<string, string>,
    initialData?: SaveOperationInput
}) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isSaving, setIsSaving] = useState(false)
    const [clients, setClients] = useState<Client[]>([])

    // Modal custom — reemplaza alert() y confirm() nativos
    const [modal, setModal] = useState<{
        open: boolean
        title: string
        message: string
        isConfirm: boolean
        onConfirm?: () => void
    }>({ open: false, title: '', message: '', isConfirm: false })

    const showAlert = (title: string, message: string) =>
        setModal({ open: true, title, message, isConfirm: false })

    const showConfirm = (title: string, message: string, onConfirm: () => void) =>
        setModal({ open: true, title, message, isConfirm: true, onConfirm })

    const closeModal = () => setModal(m => ({ ...m, open: false }))

    useEffect(() => {
        getClients().then(res => {
            if (res.success && res.data) {
                setClients(res.data)
            }
        })
    }, [])

    const [formData, setFormData] = useState<SaveOperationInput>(initialData || {
        name: '',
        date: new Date().toISOString().split('T')[0],
        type: 'SERVICES', // O 'B2B'
        clientId: undefined,
        clientName: '',
        status: 'DRAFT',
        overheadPct: parseFloat(defaultSettings.default_overhead_pct || '0.15'),
        marginPct: parseFloat(defaultSettings.default_margin_pct || '0.20'),
        riskPct: parseFloat(defaultSettings.default_risk_pct || '0.00'),
        items: []
    })

    const [globalFreight, setGlobalFreight] = useState(0)
    const [globalFreightCurrency, setGlobalFreightCurrency] = useState('EUR')
    const [globalFreightExchangeRate, setGlobalFreightExchangeRate] = useState(1.0)
    const [globalFreightValidated, setGlobalFreightValidated] = useState(false)

    useEffect(() => {
        if (initialData) {
            const freightItem = initialData.items.find(i => i.name === 'Transporte y Seguro Internacional');
            const newItems = initialData.items.filter(i => i.name !== 'Transporte y Seguro Internacional' && i.name !== 'Aranceles de Importación');
            if (freightItem) {
                setGlobalFreight(freightItem.originalCost || freightItem.unitCost);
                setGlobalFreightCurrency(freightItem.originalCurrency || 'EUR');
                setGlobalFreightExchangeRate(freightItem.exchangeRate || 1.0);
                setGlobalFreightValidated(true);
            }
            setFormData({ ...initialData, items: newItems });
        }
    }, [initialData])

    // Estado temporal de edición de un Item
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [exchangeLoading, setExchangeLoading] = useState(false)
    const [currentItem, setCurrentItem] = useState({
        name: '',
        unitQuantity: 1,
        isCommonCost: false,
        baseUnitCost: 0,
        costComponentId: '',
        originalCurrency: 'EUR',
        originalCost: undefined as number | undefined,
        exchangeRate: 1.0,
        isImport: false,
        tariffCode: '',
        tariffDescription: undefined as string | undefined,
        countryOfOrigin: '',
        tariffPct: undefined as number | undefined
    })

    const [showVAT, setShowVAT] = useState(false)

    // Estado para la busqueda de aranceles
    const [tariffSearchState, setTariffSearchState] = useState<{ loading: boolean, error: string | null, success: string | null }>({ loading: false, error: null, success: null })

    const searchTariff = async () => {
        if (!currentItem.tariffCode) return;
        setTariffSearchState({ loading: true, error: null, success: null });
        try {
            const res = await fetch(`/api/taric?code=${encodeURIComponent(currentItem.tariffCode)}`);
            const data = await res.json();
            if (data.success) {
                setCurrentItem(prev => ({ ...prev, tariffPct: data.tariffPct, tariffDescription: data.description, tariffCode: data.code }));
                setTariffSearchState({ loading: false, error: null, success: `${data.description} (${data.tariffPct}%)` });
            } else {
                setCurrentItem(prev => ({ ...prev, tariffCode: data.code }));
                setTariffSearchState({ loading: false, error: data.message || 'No encontrado. Introduce % manual.', success: null });
            }
        } catch (e: any) {
            setTariffSearchState({ loading: false, error: 'Error de conexión', success: null });
        }
    }

    // Calculo simple de coste unitario
    const calculateCurrentItemUnitCost = () => {
        return currentItem.baseUnitCost
    }

    const handleCurrencyChange = async (currency: string) => {
        if (currency === 'EUR') {
            setCurrentItem({ ...currentItem, originalCurrency: 'EUR', originalCost: undefined, exchangeRate: 1.0 })
            return
        }

        // USD
        setExchangeLoading(true)
        const dateToUse = formData.date || new Date().toISOString().split('T')[0]
        const { rate, success } = await getExchangeRate(dateToUse, 'USD', 'EUR')
        setExchangeLoading(false)

        if (success) {
            setCurrentItem(prev => ({ ...prev, originalCurrency: 'USD', exchangeRate: rate }))
        } else {
            showAlert('Error', 'No se pudo obtener el tipo de cambio. Inténtalo más tarde.')
            setCurrentItem(prev => ({ ...prev, originalCurrency: 'EUR' })) // Revert back
        }
    }

    const handleGlobalFreightCurrencyChange = async (currency: string) => {
        if (currency === 'EUR') {
            setGlobalFreightCurrency('EUR')
            setGlobalFreightExchangeRate(1.0)
            return
        }

        setExchangeLoading(true)
        const dateToUse = formData.date || new Date().toISOString().split('T')[0]
        const { rate, success } = await getExchangeRate(dateToUse, currency, 'EUR')
        setExchangeLoading(false)

        if (success) {
            setGlobalFreightCurrency(currency)
            setGlobalFreightExchangeRate(rate)
        } else {
            showAlert('Error', `No se pudo obtener el tipo de cambio para ${currency}. Inténtalo más tarde.`)
            setGlobalFreightCurrency('EUR')
            setGlobalFreightExchangeRate(1.0)
        }
    }

    const nextStep = () => setStep(s => Math.min(s + 1, 4))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    const handleLibrarySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const compId = e.target.value
        if (!compId) {
            setCurrentItem({ ...currentItem, costComponentId: '', name: '', baseUnitCost: 0 })
            return
        }
        const comp = libraryComponents.find(c => c.id === compId)
        if (comp) {
            setCurrentItem({
                ...currentItem,
                costComponentId: comp.id,
                name: comp.name,
                baseUnitCost: comp.unitCost
            })
        }
    }

    const addItem = () => {
        const totalUnitCost = calculateCurrentItemUnitCost()
        if (!currentItem.name || currentItem.unitQuantity <= 0 || totalUnitCost <= 0) return

        if (editingIndex !== null) {
            const newItems = [...formData.items]
            newItems[editingIndex] = { ...currentItem, unitCost: totalUnitCost }
            setFormData(prev => ({ ...prev, items: newItems }))
            setEditingIndex(null)
        } else {
            setFormData(prev => ({
                ...prev,
                items: [...prev.items, { ...currentItem, unitCost: totalUnitCost }]
            }))
        }

        setCurrentItem({
            name: '', unitQuantity: 1, isCommonCost: false, baseUnitCost: 0,
            costComponentId: '', originalCurrency: 'EUR', originalCost: undefined, exchangeRate: 1.0,
            isImport: false, tariffCode: '', tariffDescription: undefined, countryOfOrigin: '', tariffPct: undefined
        })
        setTariffSearchState({ loading: false, error: null, success: null })
    }

    const editItem = (index: number) => {
        const item = formData.items[index]
        setCurrentItem({
            name: item.name,
            unitQuantity: item.unitQuantity,
            isCommonCost: item.isCommonCost || false,
            baseUnitCost: item.baseUnitCost || item.unitCost,
            costComponentId: item.costComponentId || '',
            originalCurrency: item.originalCurrency || 'EUR',
            originalCost: item.originalCost || undefined,
            exchangeRate: item.exchangeRate || 1.0,
            isImport: item.isImport || false,
            tariffCode: item.tariffCode || '',
            tariffDescription: item.tariffDescription || undefined,
            countryOfOrigin: item.countryOfOrigin || '',
            tariffPct: item.tariffPct || undefined
        })
        setEditingIndex(index)
        setTariffSearchState({ loading: false, error: null, success: null })
    }

    const removeItem = (index: number) => {
        setFormData(prev => {
            const newItems = [...prev.items]
            newItems.splice(index, 1)
            return { ...prev, items: newItems }
        })
        if (editingIndex === index) {
            setEditingIndex(null)
            setCurrentItem({
                name: '', unitQuantity: 1, isCommonCost: false, baseUnitCost: 0,
                costComponentId: '', originalCurrency: 'EUR', originalCost: undefined, exchangeRate: 1.0,
                isImport: false, tariffCode: '', tariffDescription: undefined, countryOfOrigin: '', tariffPct: undefined
            })
            setTariffSearchState({ loading: false, error: null, success: null })
        } else if (editingIndex !== null && editingIndex > index) {
            setEditingIndex(editingIndex - 1)
        }
    }

    const getEffectiveItems = () => {
        const importItems = formData.items.filter(i => i.isImport);
        if (importItems.length === 0) return formData.items;

        const globalFreightEur = globalFreightCurrency === 'EUR' ? globalFreight : globalFreight * globalFreightExchangeRate;

        const totalImportBaseCost = importItems.reduce((acc, it) => acc + (it.unitQuantity * (it.baseUnitCost || it.unitCost)), 0);
        let totalArancel = 0;
        for (const item of importItems) {
            const itemBaseTotal = item.unitQuantity * (item.baseUnitCost || item.unitCost);
            const ratio = totalImportBaseCost > 0 ? (itemBaseTotal / totalImportBaseCost) : 0;
            const allocatedFreightEur = globalFreightEur * ratio;
            const customsValueEur = itemBaseTotal + allocatedFreightEur;
            totalArancel += customsValueEur * ((item.tariffPct || 0) / 100);
        }

        const effective = [...formData.items];

        if (globalFreight > 0) {
            effective.push({
                name: 'Transporte y Seguro Internacional',
                unitQuantity: 1,
                unitCost: globalFreightEur,
                baseUnitCost: globalFreightEur,
                isCommonCost: true,
                originalCost: globalFreight,
                originalCurrency: globalFreightCurrency,
                exchangeRate: globalFreightExchangeRate,
            } as any);
        }

        if (totalArancel > 0) {
            effective.push({
                name: 'Aranceles de Importación',
                unitQuantity: 1,
                unitCost: totalArancel,
                baseUnitCost: totalArancel,
                isCommonCost: true,
                originalCurrency: 'EUR',
                exchangeRate: 1.0,
            } as any);
        }

        return effective;
    }

    const handleSave = async () => {
        setIsSaving(true)
        const itemsToSave = getEffectiveItems()
        const result = await saveOperation({ ...formData, items: itemsToSave })
        setIsSaving(false)
        if (result.success) {
            router.push('/operations')
        } else {
            showAlert('Error', result.error || 'Hubo un error al guardar.')
        }
    }

    // Preview temporal de cálculos en el paso 4
    const previewCalculation = () => {
        return calculateOperationPrices({
            items: getEffectiveItems(),
            overheadPct: formData.overheadPct,
            marginPct: formData.marginPct,
            riskPct: formData.riskPct,
            corporateTaxPct: parseFloat(defaultSettings.corporate_tax_pct || '0.25'),
            legalReservePct: parseFloat(defaultSettings.legal_reserve_pct || '0.20')
        })
    }

    const totalCurrentItemCost = calculateCurrentItemUnitCost()

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
                {/* Stepper Header */}
                <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 flex items-center justify-between overflow-x-auto">
                    {[
                        { num: 1, title: 'Datos Básicos' },
                        { num: 2, title: 'Escandallo (Costes)' },
                        { num: 3, title: 'Factores Financieros' },
                        { num: 4, title: 'Precio Sugerido' }
                    ].map((s) => (
                        <div key={s.num} className="flex items-center flex-shrink-0 mr-4 sm:mr-0">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step === s.num ? 'bg-emerald-700 text-white' :
                                step > s.num ? 'bg-red-200 text-red-800' : 'bg-zinc-200 text-zinc-500'
                                }`}>
                                {step > s.num ? '✓' : s.num}
                            </div>
                            <span className={`ml-2 text-sm font-medium ${step === s.num ? 'text-zinc-900' : 'text-zinc-500'
                                }`}>
                                {s.title}
                            </span>
                            {s.num < 4 && <div className="w-4 sm:w-12 h-px bg-zinc-300 mx-2 sm:mx-4 hidden sm:block"></div>}
                        </div>
                    ))}
                </div>

                <div className="p-6">
                    {/* PASO 1: DATOS BÁSICOS */}
                    {step === 1 && (
                        <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-zinc-900">Información General del Proyecto</h2>

                            <div>
                                <label className="block text-sm font-bold text-zinc-900 mb-2">Tipo de Operación</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'SERVICES' })}
                                        className={`p-4 border-2 rounded-xl text-center transition-all ${formData.type === 'SERVICES' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
                                    >
                                        <div className="text-2xl mb-2">👨‍🔧</div>
                                        <div className="font-bold">Servicios</div>
                                        <div className="text-xs mt-1 opacity-80">Facturación de horas, tareas y mantenimientos.</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'B2B' })}
                                        className={`p-4 border-2 rounded-xl text-center transition-all ${formData.type === 'B2B' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}
                                    >
                                        <div className="text-2xl mb-2">🏢</div>
                                        <div className="font-bold">Venta B2B</div>
                                        <div className="text-xs mt-1 opacity-80">Provisión de materiales con costes comunes (fletes).</div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="opName" className="block text-sm font-medium text-zinc-700">Nombre de la Operación / Proyecto</label>
                                <input
                                    id="opName"
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Torneo Verano 2026"
                                    className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3 lg:text-lg"
                                />
                            </div>
                            <div>
                                <label htmlFor="opDate" className="block text-sm font-medium text-zinc-700">Fecha del Presupuesto</label>
                                <input
                                    id="opDate"
                                    type="date"
                                    value={formData.date ? formData.date.split('T')[0] : ''}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3"
                                />
                            </div>
                            <div>
                                <label htmlFor="clientName" className="block text-sm font-medium text-zinc-700">Cliente</label>
                                <input
                                    id="clientName"
                                    type="text"
                                    list="clients-list"
                                    value={formData.clientName || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const found = clients.find(c => c.name === val);
                                        setFormData({ ...formData, clientName: val, clientId: found ? found.id : undefined });
                                    }}
                                    placeholder="Escribe para buscar o crea uno nuevo..."
                                    className="mt-1 text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 sm:text-sm border py-2 px-3"
                                />
                                <datalist id="clients-list">
                                    {clients.map(c => <option key={c.id} value={c.name} />)}
                                </datalist>
                                {!formData.clientId && formData.clientName && formData.clientName.trim() !== '' && (
                                    <p className="text-xs text-amber-600 mt-1">Se creará automáticamente un nuevo cliente en base de datos.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PASO 2: ESCANDALLO (COSTES) */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-zinc-900">Escandallo de Costes Directos</h2>
                            <p className="text-sm text-zinc-500 mb-4">
                                Añade todos los componentes de coste puro previstos para el proyecto (Materiales, Personal, Seguros, Fletes, etc.).
                            </p>

                            {/* Moved the global freight block below */}

                            {/* Formulario Añadir Item */}
                            <div className="bg-zinc-50 p-5 rounded-lg border border-zinc-300 space-y-4 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Nueva Línea de Coste</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                    <div className="md:col-span-6">
                                        <label htmlFor="itemName" className="block text-xs font-medium text-zinc-700 mb-1">Descripción del concepto</label>
                                        <input
                                            id="itemName"
                                            type="text"
                                            list="library-components-list"
                                            value={currentItem.name}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const found = libraryComponents.find(c => c.name === val);
                                                if (found) {
                                                    setCurrentItem({ ...currentItem, name: val, costComponentId: found.id, baseUnitCost: found.unitCost });
                                                } else {
                                                    setCurrentItem({ ...currentItem, name: val, costComponentId: '' });
                                                }
                                            }}
                                            placeholder="Escribe para buscar o crea uno nuevo..."
                                            className="text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 text-sm border py-2 px-3 font-medium mb-3"
                                        />
                                        <datalist id="library-components-list">
                                            {libraryComponents.map(c => <option key={c.id} value={c.name} />)}
                                        </datalist>

                                        {formData.type === 'B2B' && (
                                            <div className="flex flex-col gap-2 mt-2">
                                                <div className={`flex items-center p-2 rounded border ${currentItem.isImport ? 'bg-zinc-50 border-zinc-200 opacity-60' : 'bg-amber-50 border-amber-200'} transition-all`}>
                                                    <input
                                                        id="isCommonCost"
                                                        type="checkbox"
                                                        checked={currentItem.isCommonCost}
                                                        disabled={currentItem.isImport}
                                                        onChange={e => setCurrentItem({ ...currentItem, isCommonCost: e.target.checked })}
                                                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 rounded disabled:opacity-50"
                                                    />
                                                    <label htmlFor="isCommonCost" className="ml-2 block text-xs text-amber-900 font-medium">
                                                        Coste general (ej. Transporte global, no se vende)
                                                    </label>
                                                </div>
                                                <div className={`flex items-center p-2 rounded border ${currentItem.isCommonCost ? 'bg-zinc-50 border-zinc-200 opacity-60' : 'bg-blue-50 border-blue-200'} transition-all`}>
                                                    <input
                                                        id="isImport"
                                                        type="checkbox"
                                                        checked={currentItem.isImport}
                                                        disabled={currentItem.isCommonCost}
                                                        onChange={e => setCurrentItem({ ...currentItem, isImport: e.target.checked })}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded disabled:opacity-50"
                                                    />
                                                    <label htmlFor="isImport" className="ml-2 block text-xs text-blue-900 font-medium">
                                                        Operación de importación (Sujeto a Aranceles)
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                        {/* Campos extra de importacion si esta marcado */}
                                        {currentItem.isImport && (
                                            <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-xs font-semibold text-blue-800 mb-1">Partida Arancelaria</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: 6109.10.00.10"
                                                            value={currentItem.tariffCode}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                setCurrentItem({ ...currentItem, tariffCode: val });
                                                                setTariffSearchState({ loading: false, error: null, success: null })
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                setCurrentItem({ ...currentItem, tariffCode: val });
                                                            }}
                                                            className="block w-full text-xs rounded border-blue-200 focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 bg-white text-zinc-900"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={searchTariff}
                                                            disabled={tariffSearchState.loading || !currentItem.tariffCode}
                                                            className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                                                        >
                                                            {tariffSearchState.loading ? '...' : 'Buscar'}
                                                        </button>
                                                    </div>
                                                    {tariffSearchState.success && <p className="text-[10px] text-emerald-600 mt-1 font-medium">✓ {tariffSearchState.success}</p>}
                                                    {tariffSearchState.error && <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠️ {tariffSearchState.error}</p>}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-blue-800 mb-1">País de Origen</label>
                                                    <select
                                                        id="countryOfOrigin"
                                                        title="País de Origen"
                                                        value={currentItem.countryOfOrigin}
                                                        onChange={(e) => setCurrentItem({ ...currentItem, countryOfOrigin: e.target.value })}
                                                        className="block w-full text-xs rounded border-blue-200 focus:border-blue-500 focus:ring-blue-500 py-2 px-2 bg-white text-zinc-900"
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        <option value="CN">China</option>
                                                        <option value="US">Estados Unidos</option>
                                                        <option value="IN">India</option>
                                                        <option value="GB">Reino Unido</option>
                                                        <option value="OT">Otro</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-semibold text-blue-800 mb-1">Porcentaje Arancel (%)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="Si no se encontró, introduce % manual"
                                                        value={currentItem.tariffPct === undefined ? '' : currentItem.tariffPct}
                                                        onChange={(e) => setCurrentItem({ ...currentItem, tariffPct: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                        className="block w-full text-xs rounded border-blue-200 focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 bg-white text-zinc-900"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label htmlFor="itemQty" className="block text-xs font-medium text-zinc-700 mb-1">Unidades</label>
                                        <input
                                            id="itemQty"
                                            type="number"
                                            min="1"
                                            step="0.1"
                                            value={currentItem.unitQuantity}
                                            onChange={e => setCurrentItem({ ...currentItem, unitQuantity: parseFloat(e.target.value) || 0 })}
                                            className="text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 text-sm border py-2 px-3 font-medium text-right font-mono"
                                        />
                                    </div>
                                    <div className="md:col-span-4 border-l border-zinc-200 pl-4 relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <label htmlFor="baseCost" className="block text-xs font-bold text-zinc-900">Coste Unitario {currentItem.originalCurrency === 'USD' ? '(USD)' : '(€)'}</label>
                                            <button
                                                type="button"
                                                onClick={() => handleCurrencyChange(currentItem.originalCurrency === 'EUR' ? 'USD' : 'EUR')}
                                                disabled={exchangeLoading}
                                                className="flex items-center justify-center text-xs bg-emerald-50 border border-emerald-200 rounded font-bold text-emerald-800 px-3 py-1 hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {currentItem.originalCurrency === 'EUR' ? '🇪🇺 EUR' : '🇺🇸 USD'} ⟲
                                            </button>
                                        </div>
                                        <div className="flex bg-zinc-50 p-2 rounded items-center relative">
                                            {exchangeLoading ? (
                                                <div className="w-full h-9 flex items-center justify-center text-zinc-400 text-sm">
                                                    Obteniendo tipo de cambio...
                                                </div>
                                            ) : (
                                                <>
                                                    {currentItem.originalCurrency === 'USD' ? (
                                                        <div className="flex-1">
                                                            <input
                                                                id="baseCostUSD"
                                                                type="number" min="0" step="0.01"
                                                                value={currentItem.originalCost || ''}
                                                                onChange={e => {
                                                                    const usdVal = parseFloat(e.target.value) || 0;
                                                                    // Si está en USD, guardamos el originalCost en USD y el baseUnitCost en EUR
                                                                    setCurrentItem({ ...currentItem, originalCost: usdVal, baseUnitCost: usdVal * currentItem.exchangeRate })
                                                                }}
                                                                className="text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 text-sm border py-2 px-3 mb-1 font-medium bg-white text-right font-mono"
                                                                placeholder="Precio en USD"
                                                            />
                                                            <div className="text-[10px] text-zinc-500 font-medium">
                                                                Equivale a: <span className="text-zinc-700 font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(currentItem.baseUnitCost)}</span> (Tasa: {currentItem.exchangeRate.toFixed(4)})
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            id="baseCost"
                                                            type="number" min="0" step="0.01"
                                                            value={currentItem.baseUnitCost}
                                                            onChange={e => setCurrentItem({ ...currentItem, baseUnitCost: parseFloat(e.target.value) || 0 })}
                                                            className="text-zinc-900 block w-full rounded-md border-zinc-300 shadow-sm focus:border-emerald-600 focus:ring-emerald-600 text-sm border py-2 px-3 font-medium bg-white text-right font-mono"
                                                            placeholder="Precio en EUR"
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200 pt-3 gap-3">
                                            <div className="text-sm font-semibold flex flex-col">
                                                <div className="flex gap-2 text-xs text-zinc-500 font-medium">
                                                    {currentItem.originalCurrency && currentItem.originalCurrency !== 'EUR' && (
                                                        <span>Divisa: {new Intl.NumberFormat('en-US', { style: 'currency', currency: currentItem.originalCurrency }).format((currentItem.originalCost || 0) * currentItem.unitQuantity)} ➔</span>
                                                    )}
                                                    <span>Traducción a EUR: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(calculateCurrentItemUnitCost() * currentItem.unitQuantity)}</span>
                                                </div>
                                                <div className="mt-1">
                                                    Total UD (EUR): <span className="text-emerald-700 font-mono text-lg ml-1">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(calculateCurrentItemUnitCost() * currentItem.unitQuantity)}</span>
                                                    {currentItem.isImport && currentItem.tariffPct !== undefined && currentItem.tariffPct > 0 && (
                                                        <div className="text-[10px] text-blue-600 mt-0.5">
                                                            + Arancel estimado ({currentItem.tariffPct}% base): <span className="font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((calculateCurrentItemUnitCost() * currentItem.unitQuantity) * (currentItem.tariffPct / 100))}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={addItem}
                                                disabled={!currentItem.name || currentItem.unitQuantity <= 0 || calculateCurrentItemUnitCost() <= 0 || exchangeLoading}
                                                className="justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-6 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
                                            >
                                                {editingIndex !== null ? 'Guardar Cambios' : 'Añadir Línea'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Moved Global Aduana directly below Nueva Linea de Coste */}
                            {formData.items.some(i => i.isImport) && (
                                <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 space-y-4 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">Valor en Aduana Global (Transporte y Seguro)</h3>
                                            <p className="text-xs text-blue-700 mt-1">Introduce el coste total del transporte internacional y seguro. Se repartirá proporcionalmente para los aranceles.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-1/2">
                                        {globalFreightValidated ? (
                                            <>
                                                <div className="flex-1 bg-white px-3 py-2 rounded-md border border-zinc-200 font-mono text-zinc-900 text-right shadow-sm select-none">
                                                    {globalFreightCurrency !== 'EUR' ? (
                                                        <div className="flex justify-end gap-2 text-xs items-center">
                                                            <span className="text-zinc-500 pr-2 border-r border-zinc-200">{new Intl.NumberFormat('en-US', { style: 'currency', currency: globalFreightCurrency }).format(globalFreight)}</span>
                                                            <span className="font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(globalFreight * globalFreightExchangeRate)}</span>
                                                        </div>
                                                    ) : (
                                                        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(globalFreight)
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setGlobalFreightValidated(false)}
                                                    className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex bg-white rounded-md border border-zinc-300 shadow-sm focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 items-center overflow-hidden flex-1">
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        value={globalFreight === 0 ? '' : globalFreight}
                                                        placeholder="0.00"
                                                        onChange={e => setGlobalFreight(parseFloat(e.target.value) || 0)}
                                                        className="block w-full text-zinc-900 text-sm py-2 px-3 text-right font-mono border-none focus:ring-0"
                                                    />
                                                    <select
                                                        value={globalFreightCurrency}
                                                        onChange={e => handleGlobalFreightCurrencyChange(e.target.value)}
                                                        disabled={exchangeLoading}
                                                        className="text-sm text-zinc-600 font-bold bg-zinc-50 border-l border-zinc-200 focus:ring-0 cursor-pointer py-2 pl-3 ml-0 border-y-0 border-r-0 rounded-none w-20 disabled:opacity-50"
                                                        title="Divisa"
                                                    >
                                                        <option value="EUR">EUR</option>
                                                        <option value="USD">USD</option>
                                                        <option value="GBP">GBP</option>
                                                        <option value="CNY">CNY</option>
                                                        <option value="JPY">JPY</option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setGlobalFreightValidated(true);
                                                        showAlert('Validación', 'El Valor en Aduana global se actualiza dinámicamente y se repartirá proporcionalmente.');
                                                    }}
                                                    className="bg-blue-600 text-white font-bold text-xs py-2 px-4 rounded shadow-sm hover:bg-blue-700"
                                                >
                                                    Validar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tabla Items */}
                            <div className="border border-zinc-200 rounded-md overflow-hidden bg-white shadow-sm">
                                <table className="min-w-full divide-y divide-zinc-200">
                                    <thead className="bg-zinc-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Concepto</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unidades</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Coste Unit. / Divisa</th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Subtotal (EUR)</th>
                                            <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-zinc-200">
                                        {getEffectiveItems().length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-zinc-500 italic">No hay costes añadidos todavía al presupuesto.</td></tr>
                                        ) : getEffectiveItems().sort((a, b) => (a.isCommonCost === b.isCommonCost ? 0 : a.isCommonCost ? 1 : -1)).map((item, idx) => {
                                            const isVirtual = item.name === 'Transporte y Seguro Internacional' || item.name === 'Aranceles de Importación';
                                            return (
                                                <tr key={idx} className={`hover:bg-zinc-50 transition-colors ${editingIndex === idx ? 'bg-amber-50 pointer-events-none opacity-50' : ''} ${isVirtual ? 'bg-emerald-50/40 pointer-events-none' : ''}`}>
                                                    <td className="px-6 py-4 text-sm font-medium text-zinc-900">
                                                        {item.name}
                                                        {item.isCommonCost && (
                                                            <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${isVirtual ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                                {isVirtual ? 'Automático' : 'Coste Común'}
                                                            </span>
                                                        )}
                                                        {item.isImport && (
                                                            <div className="mt-1 flex flex-col gap-0.5">
                                                                <span className="text-[10px] text-zinc-500">
                                                                    Importación (Arancel: {item.tariffPct || 0}%)
                                                                </span>
                                                                {item.tariffCode && (
                                                                    <span className="text-[10px] text-zinc-500">
                                                                        TARIC: {item.tariffCode} {item.tariffDescription ? `- ${item.tariffDescription}` : ''}
                                                                    </span>
                                                                )}
                                                                <div className="text-[10px] text-blue-600 font-medium">
                                                                    Desglose: {item.originalCurrency && item.originalCurrency !== 'EUR' ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: item.originalCurrency }).format((item.originalCost || 0) * item.unitQuantity)} ➔ ` : ''}
                                                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.unitCost * item.unitQuantity)} + Arancel {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((item.unitCost * item.unitQuantity) * ((item.tariffPct || 0) / 100))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-zinc-600 text-right">{item.unitQuantity}</td>
                                                    <td className="px-6 py-4 text-sm text-zinc-600 text-right">
                                                        {item.originalCurrency === 'USD' && item.originalCost ? (
                                                            <span className="text-xs text-zinc-400 mr-2">
                                                                (USD {item.originalCost.toFixed(2)})
                                                            </span>
                                                        ) : null}
                                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.unitCost)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-zinc-900 text-right font-mono">
                                                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.unitQuantity * item.unitCost)}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {!isVirtual && (
                                                            <div className="flex justify-center flex-nowrap gap-2">
                                                                <button type="button" onClick={() => editItem(idx)} className="text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 text-sm font-medium border border-zinc-200 px-2 py-1 flex justify-center items-center rounded transition-colors" title="Editar">✏️</button>
                                                                <button type="button" onClick={() => removeItem(idx)} className="text-zinc-500 hover:text-red-700 hover:bg-red-50 text-sm font-medium border border-zinc-200 px-2 py-1 flex justify-center items-center rounded transition-colors" title="Eliminar">❌</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {getEffectiveItems().length > 0 && (
                                            <tr className="bg-zinc-900">
                                                <td colSpan={2} className="px-6 py-4 text-sm font-bold text-white text-right uppercase tracking-wider">Total Costes Directos Acumulados:</td>
                                                <td className="px-6 py-4 text-xl font-bold text-emerald-500 text-right font-mono">
                                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
                                                        getEffectiveItems().reduce((acc: number, it: any) => acc + (it.unitQuantity * it.unitCost), 0)
                                                    )}
                                                </td>
                                                <td></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PASO 3: PARÁMETROS */}
                    {step === 3 && (
                        <div className="space-y-6 w-full max-w-5xl animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-zinc-900">Factores y Parámetros Financieros</h2>
                                <button
                                    onClick={() => {
                                        showConfirm(
                                            '✨ AI Controller Financiero',
                                            'Analizaré tus costes y te sugeriré los parámetros de rentabilidad ideales para esta operación. ¿Continuar?',
                                            async () => {
                                                closeModal()
                                                const btn = document.getElementById('ai-btn') as HTMLButtonElement
                                                if (btn) btn.innerText = 'Analizando...'
                                                try {
                                                    const res = await fetch('/api/ai-controller', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ name: formData.name, clientName: formData.clientName, items: formData.items })
                                                    })
                                                    if (!res.ok) throw new Error(await res.text())
                                                    const data = await res.json()
                                                    setFormData({
                                                        ...formData,
                                                        marginPct: parseFloat((data.suggestedMarginPct).toFixed(4)),
                                                        overheadPct: parseFloat((data.suggestedOverheadPct).toFixed(4)),
                                                        riskPct: parseFloat((data.suggestedRiskPct).toFixed(4)),
                                                        aiSuggestedReasoning: data.reasoning
                                                    })
                                                    showAlert('Sugerencia del Controller Financiero', data.reasoning)
                                                } catch (e: any) {
                                                    showAlert('Error del AI Controller', e.message)
                                                } finally {
                                                    if (btn) btn.innerText = '✨ Preguntar al AI Controller'
                                                }
                                            }
                                        )
                                    }}
                                    id="ai-btn"
                                    className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow hover:shadow-lg transition-transform hover:scale-105"
                                >
                                    ✨ Preguntar al AI Controller
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Tarjeta Margen */}
                                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm text-center">
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <span className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">1</span>
                                            <span className="text-sm font-bold text-emerald-900">Margen Comercial</span>
                                        </div>
                                        <p className="text-xs text-emerald-700 leading-snug">Beneficio bruto garantizado sobre la venta. A más margen, más caja.</p>
                                    </div>
                                    <div className="flex items-baseline justify-center gap-2 py-2">
                                        <input
                                            id="marginPct" title="Margen Comercial %"
                                            type="number" step="1" min="0" max="100"
                                            value={Math.round(formData.marginPct * 100)}
                                            onChange={e => setFormData({ ...formData, marginPct: parseFloat(((parseFloat(e.target.value) || 0) / 100).toFixed(4)) })}
                                            className="w-full text-center text-4xl font-black text-emerald-900 bg-white border-2 border-emerald-300 rounded-lg py-2 px-3 focus:outline-none focus:border-emerald-600"
                                        />
                                        <span className="text-3xl font-black text-emerald-700 shrink-0">%</span>
                                    </div>
                                    <input type="range" min="0" max="80" step="1" title="Margen Comercial %"
                                        value={Math.round(formData.marginPct * 100)}
                                        onChange={e => setFormData({ ...formData, marginPct: parseFloat(((parseFloat(e.target.value) || 0) / 100).toFixed(4)) })}
                                        className="w-full accent-emerald-700"
                                    />
                                </div>

                                {/* Tarjeta Estructura */}
                                <div className="bg-white border-2 border-zinc-200 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm text-center">
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <span className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">2</span>
                                            <span className="text-sm font-bold text-zinc-900">Coste Estructura</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 leading-snug">Gastos fijos que existen aunque no factures (alquiler, sueldos fijos, seguros...).</p>
                                    </div>
                                    <div className="flex items-baseline justify-center gap-2 py-2">
                                        <input
                                            id="overheadPct" title="Coste Estructura %"
                                            type="number" step="1" min="0" max="100"
                                            value={Math.round(formData.overheadPct * 100)}
                                            onChange={e => setFormData({ ...formData, overheadPct: parseFloat(((parseFloat(e.target.value) || 0) / 100).toFixed(4)) })}
                                            className="w-full text-center text-4xl font-black text-zinc-900 bg-zinc-50 border-2 border-zinc-300 rounded-lg py-2 px-3 focus:outline-none focus:border-zinc-700"
                                        />
                                        <span className="text-3xl font-black text-zinc-500 shrink-0">%</span>
                                    </div>
                                    <input type="range" min="0" max="50" step="1" title="Coste Estructura %"
                                        value={Math.round(formData.overheadPct * 100)}
                                        onChange={e => setFormData({ ...formData, overheadPct: parseFloat(((parseFloat(e.target.value) || 0) / 100).toFixed(4)) })}
                                        className="w-full accent-zinc-700"
                                    />
                                </div>

                                {/* Tarjeta Riesgo */}
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm text-center">
                                    <div>
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">3</span>
                                            <span className="text-sm font-bold text-amber-900">Riesgo / Desviación</span>
                                        </div>
                                        <p className="text-xs text-amber-700 leading-snug">Colchón ante imprevistos: bajas, retrasos, devoluciones o clima adverso.</p>
                                    </div>
                                    <div className="flex items-baseline justify-center gap-2 py-2">
                                        <input
                                            id="riskPct" title="Riesgo / Desviación %"
                                            type="number" step="1" min="0" max="50"
                                            value={Math.round(formData.riskPct * 100)}
                                            onChange={e => setFormData({ ...formData, riskPct: parseFloat(((parseFloat(e.target.value) || 0) / 100).toFixed(4)) })}
                                            className="w-full text-center text-4xl font-black text-amber-900 bg-white border-2 border-amber-300 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-500"
                                        />
                                        <span className="text-3xl font-black text-amber-600 shrink-0">%</span>
                                    </div>
                                    <input type="range" min="0" max="30" step="1" title="Riesgo / Desviación %"
                                        value={Math.round(formData.riskPct * 100)}
                                        onChange={e => setFormData({ ...formData, riskPct: parseFloat(((parseFloat(e.target.value) || 0) / 100).toFixed(4)) })}
                                        className="w-full accent-amber-500"
                                    />
                                </div>
                            </div>

                            {/* PREVISIÓN EN TIEMPO REAL */}
                            {(() => {
                                const res = previewCalculation()
                                const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
                                return (
                                    <div className="mt-8 bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                        <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-zinc-900">Previsión de Precios Sugeridos en Tiempo Real</h3>
                                                <p className="text-xs text-zinc-500">Impacto inmediato de los parámetros financieros sobre cada concepto facturable.</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
                                                <span className={`text-xs font-bold ${!showVAT ? 'text-zinc-900' : 'text-zinc-400'}`}>SIN IVA</span>
                                                <button
                                                    type="button"
                                                    aria-label="Cambiar IVA"
                                                    onClick={() => setShowVAT(!showVAT)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showVAT ? 'bg-emerald-600' : 'bg-zinc-300'}`}
                                                >
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showVAT ? 'translate-x-4' : 'translate-x-1'}`} />
                                                </button>
                                                <span className={`text-xs font-bold ${showVAT ? 'text-zinc-900' : 'text-zinc-400'}`}>CON IVA (21%)</span>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-zinc-200">
                                                <thead className="bg-zinc-50">
                                                    <tr>
                                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Concepto Facturable</th>
                                                        <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Uds.</th>
                                                        <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border-l border-emerald-100">PVP Unitario Requerido</th>
                                                        <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50">Total Línea</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-zinc-200">
                                                    {allocateTargetPriceToItems(
                                                        getEffectiveItems().map((it, idx) => ({
                                                            id: String(idx),
                                                            unitQuantity: it.unitQuantity,
                                                            totalCost: it.unitQuantity * it.unitCost,
                                                            isCommonCost: it.isCommonCost || false
                                                        })),
                                                        res
                                                    ).map((alloc, i) => {
                                                        const effectiveItems = getEffectiveItems();
                                                        const item = effectiveItems[i];
                                                        if (item?.isCommonCost) return null;

                                                        return (
                                                            <tr key={i} className="hover:bg-zinc-50">
                                                                <td className="px-6 py-4 text-sm font-medium text-zinc-900">{item.name}</td>
                                                                <td className="px-6 py-4 text-sm text-zinc-500 text-right">{item.unitQuantity}</td>
                                                                <td className="px-6 py-4 text-sm font-bold text-emerald-700 text-right font-mono bg-emerald-50/30 border-l border-emerald-50">
                                                                    {formatEuro(showVAT ? alloc.unitSellingPriceWithVAT : alloc.unitSellingPrice)}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-bold text-emerald-900 text-right font-mono bg-emerald-50/50">
                                                                    {formatEuro(showVAT ? alloc.totalSellingPriceWithVAT : alloc.totalSellingPrice)}
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}

                    {/* PASO 4: REVISIÓN */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-xl font-bold text-zinc-900">Revisión Oficial y Precio Requerido</h2>
                            <p className="text-zinc-500 text-sm">Resumen completo de los cálculos considerando fiscalidad y reservas legales estrictas.</p>

                            {(() => {
                                const res = previewCalculation()
                                const formatEuro = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

                                return (
                                    <>
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* BLOQUE 1: COSTES */}
                                            <div className="bg-white p-6 rounded-lg shadow-sm border-2 border-zinc-200 relative">
                                                <div className="absolute -top-3 -left-3 bg-zinc-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
                                                <h3 className="text-sm font-bold uppercase text-zinc-900 mb-4 tracking-wider ml-4">Coste Operativo Real</h3>
                                                <p className="text-xs text-zinc-500 mb-4 ml-4">Las 3 capas de coste de tu operación.</p>

                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-zinc-700 font-bold">A) Coste Directo</span>
                                                            <span className="font-mono text-zinc-900">{formatEuro(res.totalDirectCost)}</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-500">Lo que cuesta hacer el servicio o producto.</p>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-zinc-700 font-bold">B) Estructura ({(formData.overheadPct * 100).toFixed(1)}%)</span>
                                                            <span className="font-mono text-zinc-900">{formatEuro(res.totalOverheadCost)}</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-500">Lo que existe aunque no factures.</p>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-zinc-700 font-bold">C) Riesgo ({(formData.riskPct * 100).toFixed(1)}%)</span>
                                                            <span className="font-mono text-zinc-900">{formatEuro(res.totalCost - res.totalDirectCost - res.totalOverheadCost)}</span>
                                                        </div>
                                                        <p className="text-xs text-zinc-500">Tu colchón de supervivencia (imprevistos).</p>
                                                    </div>

                                                    <div className="pt-4 border-t-2 border-zinc-900 flex justify-between text-base">
                                                        <span className="text-zinc-900 font-black uppercase">Coste Total</span>
                                                        <span className="font-mono text-zinc-900 font-black">{formatEuro(res.totalCost)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BLOQUE 2: MARGEN Y PRECIO */}
                                            <div className="bg-emerald-50 p-6 rounded-lg shadow-sm border-2 border-emerald-200 relative">
                                                <div className="absolute -top-3 -left-3 bg-emerald-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
                                                <h3 className="text-sm font-bold uppercase text-emerald-900 mb-4 tracking-wider ml-4">Fijación de Precio</h3>
                                                <p className="text-xs text-emerald-700 mb-4 ml-4">Aplicando tu margen comercial del {(formData.marginPct * 100).toFixed(1)}%.</p>

                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-emerald-900 font-medium">Coste Operativo Total</span>
                                                            <span className="font-mono text-emerald-900">{formatEuro(res.totalCost)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-emerald-900 font-black">+ Margen Operativo Bruto</span>
                                                            <span className="font-mono text-emerald-900 font-bold">{formatEuro(res.expectedBenefit)}</span>
                                                        </div>
                                                        <p className="text-xs text-emerald-700">Beneficio bruto garantizado sobre la venta.</p>
                                                    </div>

                                                    <div className="pt-4 border-t-2 border-emerald-900 flex flex-col justify-center items-center text-center">
                                                        <span className="text-emerald-900 font-black uppercase text-xs tracking-widest mb-1">Precio Objetivo Mínimo</span>
                                                        <span className="font-mono text-emerald-700 font-black text-4xl">{formatEuro(res.targetPrice)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BLOQUE 3: REALIDAD FISCAL */}
                                            <div className="bg-zinc-900 text-white p-6 rounded-lg shadow-sm border-2 border-black relative">
                                                <div className="absolute -top-3 -left-3 bg-white text-black w-8 h-8 rounded-full flex items-center justify-center font-bold">3</div>
                                                <h3 className="text-sm font-bold uppercase text-zinc-100 mb-4 tracking-wider ml-4">Realidad: El 60% Real</h3>
                                                <p className="text-xs text-zinc-400 mb-4 ml-4">De tu margen bruto, solo te quedas el 60% real tras obligaciones.</p>

                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-zinc-300 font-medium">Margen Operativo Bruto</span>
                                                            <span className="font-mono text-zinc-100">{formatEuro(res.expectedBenefit)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-sm text-red-300">
                                                            <span className="font-medium">- 25% Impuesto Soc.</span>
                                                            <span className="font-mono font-bold">-{formatEuro(res.corporateTax)}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-sm text-yellow-300">
                                                            <span className="font-medium">- 20% Reserva Legal</span>
                                                            <span className="font-mono font-bold">-{formatEuro(res.legalReserve)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t-2 border-zinc-700 flex flex-col items-center">
                                                        <span className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-1">Caja Libre (Beneficio Neto)</span>
                                                        <span className="font-mono text-emerald-400 font-black text-3xl">{formatEuro(res.netBenefit)}</span>
                                                    </div>
                                                </div>

                                                {res.netBenefit < 0 && (
                                                    <div className="mt-6 bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-xs">
                                                        <strong>⚠️ Riesgo Crítico:</strong> Pérdidas reales de liquidez. Aumenta el Margen Comercial.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* BLOQUE 4: DESGLOSE DE PRECIOS UNITARIOS */}
                                        {formData.items.filter(i => !i.isCommonCost).length > 0 && (
                                            <div className="mt-8 bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                                <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-zinc-900">Precios de Venta Sugeridos</h3>
                                                        <p className="text-xs text-zinc-500">Reparto ponderado del Precio Objetivo Mínimo entre los conceptos facturables.</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
                                                        <span className={`text-xs font-bold ${!showVAT ? 'text-zinc-900' : 'text-zinc-400'}`}>SIN IVA</span>
                                                        <button
                                                            type="button"
                                                            aria-label="Cambiar IVA"
                                                            onClick={() => setShowVAT(!showVAT)}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showVAT ? 'bg-emerald-600' : 'bg-zinc-300'}`}
                                                        >
                                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showVAT ? 'translate-x-4' : 'translate-x-1'}`} />
                                                        </button>
                                                        <span className={`text-xs font-bold ${showVAT ? 'text-zinc-900' : 'text-zinc-400'}`}>CON IVA (21%)</span>
                                                    </div>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-zinc-200">
                                                        <thead className="bg-zinc-50">
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Concepto Facturable</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Uds.</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border-l border-emerald-100">PVP Unitario</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50">Total Línea</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-zinc-200">
                                                            {allocateTargetPriceToItems(
                                                                getEffectiveItems().map((it, idx) => ({
                                                                    id: String(idx),
                                                                    unitQuantity: it.unitQuantity,
                                                                    totalCost: it.unitQuantity * it.unitCost,
                                                                    isCommonCost: it.isCommonCost || false
                                                                })),
                                                                res
                                                            ).map((alloc, i) => {
                                                                const effectiveItems = getEffectiveItems();
                                                                const item = effectiveItems[i];
                                                                if (item?.isCommonCost) return null;

                                                                return (
                                                                    <tr key={i} className="hover:bg-zinc-50">
                                                                        <td className="px-6 py-4 text-sm font-medium text-zinc-900">{item.name}</td>
                                                                        <td className="px-6 py-4 text-sm text-zinc-500 text-right">{item.unitQuantity}</td>
                                                                        <td className="px-6 py-4 text-sm font-bold text-emerald-700 text-right font-mono bg-emerald-50/30 border-l border-emerald-50">
                                                                            {formatEuro(showVAT ? alloc.unitSellingPriceWithVAT : alloc.unitSellingPrice)}
                                                                        </td>
                                                                        <td className="px-6 py-4 text-sm font-bold text-emerald-900 text-right font-mono bg-emerald-50/50">
                                                                            {formatEuro(showVAT ? alloc.totalSellingPriceWithVAT : alloc.totalSellingPrice)}
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="border-t border-zinc-200 px-6 py-4 bg-zinc-50 flex items-center justify-between">
                    <button
                        onClick={prevStep}
                        disabled={step === 1 || isSaving}
                        className="inline-flex justify-center rounded-md border border-zinc-300 bg-white py-2 px-6 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50 transition-colors"
                    >
                        Volver
                    </button>

                    {step < 4 ? (
                        <button
                            onClick={nextStep}
                            disabled={(step === 1 && (!formData.name || !formData.clientName || formData.clientName.trim() === '')) || (step === 2 && formData.items.length === 0)}
                            className="inline-flex justify-center rounded-md border border-transparent bg-zinc-900 py-2 px-8 text-sm font-bold tracking-wide text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                        >
                            Continuar
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex justify-center rounded-md border border-transparent bg-emerald-700 py-2 px-10 text-sm font-bold tracking-wide text-white shadow-md hover:bg-emerald-800 hover:shadow-lg disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
                        >
                            {isSaving ? 'Registrando Operación...' : 'Confirmar y Guardar Presupuesto'}
                        </button>
                    )}
                </div>
            </div >

            {/* MODAL CUSTOM — reemplaza alert/confirm del navegador */}
            {
                modal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                        {/* Caja del modal */}
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                            {/* Cabecera */}
                            <div className="bg-emerald-700 px-6 py-4 flex items-center justify-between">
                                <h3 className="text-white font-bold text-base tracking-wide">{modal.title}</h3>
                                <button onClick={closeModal} className="text-emerald-200 hover:text-white text-xl leading-none">&times;</button>
                            </div>
                            {/* Cuerpo scrollable */}
                            <div className="px-6 py-5 max-h-72 overflow-y-auto">
                                <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap">{modal.message}</p>
                            </div>
                            {/* Botones */}
                            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
                                {modal.isConfirm && (
                                    <button
                                        onClick={closeModal}
                                        className="px-5 py-2 rounded-lg border border-zinc-300 text-zinc-600 text-sm font-medium hover:bg-zinc-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (modal.isConfirm && modal.onConfirm) modal.onConfirm()
                                        else closeModal()
                                    }}
                                    className="px-6 py-2 rounded-lg bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition-colors shadow"
                                >
                                    {modal.isConfirm ? 'Continuar' : 'Aceptar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    )
}
