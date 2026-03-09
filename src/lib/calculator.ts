/**
 * Motor de Cálculo Financiero - NAUDEA
 * 
 * Implementación estricta de las reglas de cálculo de rentabilidad para pricing.
 */

// Parámetros de entrada para el cálculo
export interface OperationInput {
    items: Array<{
        unitQuantity: number;
        unitCost: number;
    }>;
    overheadPct: number;    // % de costes de estructura (ej: 0.15 para 15%)
    marginPct: number;      // % de margen de beneficio esperado (ej: 0.20 para 20%)
    riskPct?: number;       // % de riesgo (ej: 0.05 para 5%), por defecto 0
    corporateTaxPct: number;// % de impuesto de sociedades (ej: 0.25 para 25%)
    legalReservePct: number;// % de reserva legal (ej: 0.20 para 20%)
}

// Resultados del motor de cálculo
export interface OperationResult {
    totalDirectCost: number;
    totalOverheadCost: number;
    totalCost: number;
    targetPrice: number;
    expectedMargin: number;
    expectedBenefit: number;
    corporateTax: number;
    legalReserve: number;
    netBenefit: number;
}

export function calculateOperationPrices(input: OperationInput): OperationResult {
    const {
        items,
        overheadPct,
        marginPct,
        riskPct = 0,
        corporateTaxPct,
        legalReservePct
    } = input;

    // 1. Costes Directos
    const totalDirectCost = items.reduce(
        (acc, item) => acc + (item.unitQuantity * item.unitCost),
        0
    );

    // 2. Costes de Estructura (Overhead)
    const totalOverheadCost = totalDirectCost * overheadPct;

    // 3. Costes de Riesgo (Risk)
    const totalRiskCost = totalDirectCost * riskPct;

    // 4. Coste Total
    const totalCost = totalDirectCost + totalOverheadCost + totalRiskCost;

    // 5. Precio Objetivo (Target Price) basado en el margen sobre ventas
    // Fórmula: Precio = Coste Total / (1 - Margen%)
    const targetPrice = marginPct < 1 ? (totalCost / (1 - marginPct)) : 0;

    // 6. Beneficio Bruto Esperado
    const expectedBenefit = targetPrice - totalCost;

    // 7. Margen Esperado (comprobación, debe coincidir con targetPrice * marginPct)
    const expectedMargin = expectedBenefit;

    // 8. Impuesto de Sociedades (solo si hay beneficio positivo)
    const corporateTax = expectedBenefit > 0 ? expectedBenefit * corporateTaxPct : 0;

    // 9. Beneficio después de impuestos
    const benefitAfterTax = expectedBenefit - corporateTax;

    // 10. Reserva Legal (sobre el beneficio después de impuestos, si es positivo)
    const legalReserve = benefitAfterTax > 0 ? benefitAfterTax * legalReservePct : 0;

    // 11. Beneficio Neto Real Definitivo
    const netBenefit = benefitAfterTax - legalReserve;

    return {
        totalDirectCost,
        totalOverheadCost,
        totalCost,
        targetPrice,
        expectedMargin,
        expectedBenefit,
        corporateTax,
        legalReserve,
        netBenefit
    };
}
