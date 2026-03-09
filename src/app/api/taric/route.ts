import { NextResponse } from 'next/server'

// Mock Data para TARIC (Ejemplos comunes)
// En un entorno real, esto conectaría a una base de datos propia actualizada
// o a una API de terceros pagada.
const TARIC_DATABASE: Record<string, { description: string; tariffPct: number }> = {
    // Capítulo 61: Prendas y complementos de vestir, de punto
    '61091000': { description: 'T-shirts y camisetas, de punto, de algodón', tariffPct: 12.0 },
    '61102091': { description: 'Suéteres, jerseys, pulóveres, de algodón', tariffPct: 12.0 },

    // Capítulo 62: Prendas y complementos de vestir, excepto los de punto
    '62034231': { description: 'Pantalones de algodón para hombres/niños', tariffPct: 12.0 },
    '6207991000': { description: 'Camisetas y ropa interior, de otras materias textiles', tariffPct: 12.0 },
    '6207': { description: 'Camisetas, calzoncillos, camisones, pijamas, albornoces', tariffPct: 12.0 },

    // Capítulo 64: Calzado, polainas y artículos análogos
    '64039993': { description: 'Calzado con suela de caucho, plástico o cuero', tariffPct: 8.0 },
    '64041100': { description: 'Calzado de deporte (zapatillas, tenis)', tariffPct: 16.9 },

    // Capítulo 85: Máquinas, aparatos y material eléctrico
    '85171200': { description: 'Teléfonos inteligentes y otros aparatos de telecomunicación', tariffPct: 0.0 },
    '85285210': { description: 'Monitores de los tipos utilizados exclusiva o principalmente en un sistema de procesamiento de datos', tariffPct: 0.0 },
    '85044030': { description: 'Convertidores estáticos (fuentes de alimentación)', tariffPct: 3.3 },

    // Capítulo 94: Muebles; mobiliario medicoquirúrgico; artículos de cama
    '94033010': { description: 'Muebles de madera de los tipos utilizados en oficinas', tariffPct: 0.0 },
    '94013000': { description: 'Asientos giratorios de altura ajustable', tariffPct: 0.0 },

    // Capítulo 95: Juguetes, juegos y artículos para recreo o deporte
    '95030041': { description: 'Juguetes rellenos que representen animales o seres no humanos', tariffPct: 4.7 },
    '95045000': { description: 'Videoconsolas y máquinas de videojuego', tariffPct: 0.0 },
    '95069110': { description: 'Artículos y material para gimnasia o atletismo', tariffPct: 2.7 }
}

function formatTaricCode(code: string): string {
    // Solo dígitos
    const digits = code.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
        if (i === 4 || i === 6 || i === 8) {
            formatted += '.';
        }
        formatted += digits[i];
    }
    return formatted;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.json({ error: 'Falta el código TARIC' }, { status: 400 })
    }

    // Sanitizar entrada (eliminar puntuación para buscar)
    const sanitizedCode = code.replace(/\D/g, '')

    // Buscar coincidencia exacta (o aproximación por capítulos)
    let result = null;
    let matchCode = sanitizedCode;

    // Buscar la coincidencia más larga posible
    while (matchCode.length >= 4) {
        if (TARIC_DATABASE[matchCode]) {
            result = TARIC_DATABASE[matchCode];
            break;
        }
        matchCode = matchCode.slice(0, -1);
    }

    const formattedCode = formatTaricCode(sanitizedCode)

    if (result) {
        return NextResponse.json({
            success: true,
            code: formattedCode,
            description: result.description,
            tariffPct: result.tariffPct
        })
    } else {
        // En lugar de dar error, vamos a devolver un genérico o indicar que no se encontró pero permitir poner % manual
        return NextResponse.json({
            success: false,
            code: formattedCode,
            message: 'Partida arancelaria no encontrada en la base de datos local. El usuario deberá introducir el % manualmente.'
        }, { status: 404 })
    }
}
