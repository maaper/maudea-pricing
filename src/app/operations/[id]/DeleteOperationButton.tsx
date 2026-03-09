'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteOperation } from '@/app/actions/operations'

export default function DeleteOperationButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar este presupuesto? Esta acción no se puede deshacer.')) {
            return
        }

        setIsDeleting(true)
        const result = await deleteOperation(id)

        if (result.success) {
            router.push('/operations')
        } else {
            alert(result.error || 'Error al eliminar el presupuesto')
            setIsDeleting(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex justify-center rounded-md border border-red-200 bg-red-50 py-2 px-6 text-sm font-medium text-red-600 shadow-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
            {isDeleting ? 'Eliminando...' : 'Eliminar Presupuesto'}
        </button>
    )
}
