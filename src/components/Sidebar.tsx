'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Presupuestos', href: '/operations' },
    { name: 'Estructura', href: '/structure' },
    { name: 'Componentes Coste', href: '/components' },
    { name: 'Clientes', href: '/clients' },
    { name: 'Configuración', href: '/settings' },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="w-64 bg-zinc-950 text-zinc-300 flex flex-col h-full border-r border-zinc-800">
            <div className="h-16 flex items-center px-6 border-b border-zinc-800 bg-black">
                <Link href="/" className="flex items-center gap-3">
                    <img src="/logo.svg" alt="Naudea Logo" className="w-8 h-8 rounded-full" />
                    <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
                        NAUDEA<span className="text-xs font-normal text-zinc-500 ml-1">PRICING</span>
                    </h1>
                </Link>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`block px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                                ? 'bg-emerald-700 text-white shadow-sm'
                                : 'hover:bg-zinc-800 hover:text-white'
                                }`}
                        >
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-zinc-800">
                <div className="text-xs text-zinc-500 font-mono">
                    Control Financiero Interno
                </div>
            </div>
        </div>
    )
}
