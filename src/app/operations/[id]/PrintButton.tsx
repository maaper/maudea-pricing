'use client'

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="inline-flex justify-center rounded-md border border-zinc-300 bg-white py-2 px-6 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors print:hidden"
            title="Generar PDF / Imprimir"
        >
            <span className="mr-2">🖨️</span> PDF / Imprimir
        </button>
    )
}
