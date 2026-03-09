import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'file:./dev.db',
})

async function main() {
    console.log('Start seeding ...')

    // Configuración global inicial (Ej: % de reserva legal, IS)
    const settings = [
        { key: 'legal_reserve_pct', value: '0.20' }, // 20%
        { key: 'corporate_tax_pct', value: '0.25' }, // 25%
        { key: 'default_risk_pct', value: '0.00' },
        { key: 'default_margin_pct', value: '0.20' }
    ]

    for (const s of settings) {
        await prisma.setting.upsert({
            where: { key: s.key },
            update: {},
            create: s,
        })
    }
    console.log('Settings seeded.')

    // Costes de estructura fijos iniciales
    const structureCosts = [
        { name: 'Alquiler Nave', annualAmount: 24000, description: 'Alquiler de las instalaciones' },
        { name: 'Salarios Administración', annualAmount: 45000, description: 'Personal de oficina' },
        { name: 'Seguros Generales', annualAmount: 3500 },
    ]

    for (const sc of structureCosts) {
        const existing = await prisma.structureCost.findFirst({
            where: { name: sc.name }
        })
        if (!existing) {
            await prisma.structureCost.create({
                data: sc
            })
        }
    }
    console.log('Structure costs seeded.')

    // Componentes de coste básicos para tener en biblioteca
    const costComponents = [
        { name: 'Monitor Deportivo', unitCost: 15.50, unitType: 'hora', category: 'Personal' },
        { name: 'Desplazamiento Furgoneta', unitCost: 0.35, unitType: 'km', category: 'Desplazamiento' },
        { name: 'Material Fungible Kit A', unitCost: 45.00, unitType: 'unidad', category: 'Material' },
    ]

    for (const cc of costComponents) {
        const existing = await prisma.costComponent.findFirst({
            where: { name: cc.name }
        })
        if (!existing) {
            await prisma.costComponent.create({
                data: cc
            })
        }
    }
    console.log('Cost components seeded.')

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
