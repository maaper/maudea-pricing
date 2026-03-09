'use server'

/**
 * Consulta la tasa de cambio histórica o actual de la API pública Frankfurter.
 * No requiere API Keys y es gratuita para uso razonable.
 */
export async function getExchangeRate(dateStr: string, from: string = 'USD', to: string = 'EUR'): Promise<{ rate: number, success: boolean, error?: string }> {
    try {
        // La API prefiere YYYY-MM-DD
        const formattedDate = dateStr.split('T')[0];
        const url = `https://api.frankfurter.app/${formattedDate}?from=${from}&to=${to}`;

        const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache 1 hora

        if (!res.ok) {
            console.error(`Error en Frankfurter API: ${res.statusText}`);
            // Fallback rate si la API falla hoy o es fin de semana previo sin datos: intentar coger "latest"
            if (res.status === 404) {
                const latestRes = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
                if (latestRes.ok) {
                    const latestData = await latestRes.json();
                    return { rate: latestData.rates[to], success: true };
                }
            }
            throw new Error('No se pudo obtener el tipo de cambio');
        }

        const data = await res.json();
        const rate = data.rates[to];

        if (!rate) throw new Error(`Tasa ${to} no encontrada en la respuesta`);

        return { rate, success: true };
    } catch (error: any) {
        console.error('Error getExchangeRate:', error);
        return { rate: 1, success: false, error: error.message };
    }
}
