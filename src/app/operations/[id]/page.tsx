import { notFound } from 'next/navigation'
import { getOperationById } from '@/app/actions/operations'
import OperationDetailClient from './OperationDetailClient'

export default async function OperationDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const response = await getOperationById(id)

    if (!response.success || !response.data) {
        notFound()
    }

    const op = response.data
    const res = op.resultCache

    return <OperationDetailClient op={op} res={res} />
}
