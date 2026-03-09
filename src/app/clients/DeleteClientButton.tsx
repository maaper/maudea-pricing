'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteClient } from '@/app/actions/clients'

export default function DeleteClientButton({ id, name, opsCount }: { id: string, name: string, opsCount: number }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (opsCount > 0) {
            alert(`No puedes eliminar a ${name} porque tiene ${opsCount} presupuesto(s) asociado(s). Elimínalos primero.`)
            return
        }

        if (!confirm(`¿Estás seguro de que quieres eliminar al cliente ${name}?`)) {
            return
        }

        setIsDeleting(true)
        const result = await deleteClient(id)

        if (result.success) {
            router.refresh()
        } else {
            alert(result.error || 'Error al eliminar el cliente')
            setIsDeleting(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting || opsCount > 0}
            title={opsCount > 0 ? 'No se puede eliminar un cliente con presupuestos asociados' : `Eliminar ${name}`}
            className="text-zinc-400 hover:text-red-600 transition-colors focus:outline-none disabled:opacity-30 disabled:hover:text-zinc-400 ml-4"
        >
            {isDeleting ? '⏳' : '🗑️'}
        </button>
    )
}
