'use server'

import prisma from '@/lib/prisma'

export interface ClientInput {
    name: string
    taxId?: string
    email?: string
    phone?: string
}

export async function searchClients(query: string) {
    if (!query || query.length < 2) return { success: true, data: [] };
    try {
        const clients = await prisma.client.findMany({
            where: {
                name: {
                    contains: query
                } // SQLite contains is case-insensitive by default with Prisma in some configs, but standard is case sensitive. We will just use contains.
            },
            take: 10
        });
        return { success: true, data: clients };
    } catch (error) {
        console.error('Error searching clients:', error);
        return { success: false, error: 'Error al buscar clientes' };
    }
}

export async function getClients() {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: clients };
    } catch (error) {
        console.error('Error fetching clients:', error);
        return { success: false, error: 'Error al obtener clientes' };
    }
}

export async function createClient(data: ClientInput) {
    try {
        const existing = await prisma.client.findUnique({
            where: { name: data.name }
        });
        if (existing) {
            return { success: false, error: 'Ya existe un cliente con ese nombre' };
        }

        const client = await prisma.client.create({
            data: {
                name: data.name,
                taxId: data.taxId || null,
                email: data.email || null,
                phone: data.phone || null
            }
        });
        return { success: true, data: client };
    } catch (error) {
        console.error('Error creating client:', error);
        return { success: false, error: 'Error al crear el cliente' };
    }
}

export async function deleteClient(id: string) {
    try {
        const operationsCount = await prisma.operation.count({
            where: { clientId: id }
        });

        if (operationsCount > 0) {
            return { success: false, error: 'No se puede eliminar el cliente porque tiene presupuestos asociados.' };
        }

        await prisma.client.delete({
            where: { id }
        });

        return { success: true };
    } catch (error) {
        console.error('Error deleting client:', error);
        return { success: false, error: 'Error al eliminar el cliente.' };
    }
}
