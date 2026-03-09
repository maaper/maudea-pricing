import { describe, it, expect } from 'vitest';
import { calculateOperationPrices, OperationInput } from '../calculator';

describe('Calculator Core logic', () => {

    const defaultInput: OperationInput = {
        items: [
            { unitQuantity: 10, unitCost: 15 }, // 150
            { unitQuantity: 100, unitCost: 0.5 } // 50
        ], // Total Direct Cost = 200
        overheadPct: 0.15, // 15% -> 30
        marginPct: 0.20,   // 20%
        riskPct: 0.05,     // 5% -> 10
        corporateTaxPct: 0.25, // 25%
        legalReservePct: 0.20  // 20%
    };

    it('debería calcular correctamente un presupuesto básico con beneficio', () => {
        const result = calculateOperationPrices(defaultInput);

        expect(result.totalDirectCost).toBe(200);
        expect(result.totalOverheadCost).toBe(30);
        expect(result.totalCost).toBe(240); // 200 + 30 + 10 (risk)

        // Formula: Precio = CostoTotal / (1 - Margen%) => 240 / 0.8 = 300
        expect(result.targetPrice).toBe(300);

        // Expected Benefit = TargetPrice - TotalCost = 300 - 240 = 60
        expect(result.expectedBenefit).toBe(60);
        expect(result.expectedMargin).toBe(60); // same as expectedBenefit

        // IS (25% sobre 60) = 15
        expect(result.corporateTax).toBe(15);

        // Benefit after tax = 60 - 15 = 45
        // Legal Reserve (20% sobre 45) = 9
        expect(result.legalReserve).toBe(9);

        // Net Benefit = 45 - 9 = 36
        expect(result.netBenefit).toBe(36);
    });

    it('no debería aplicar impuestos ni reserva legal si el beneficio es negativo', () => {
        const inputWithoutMargin: OperationInput = {
            ...defaultInput,
            marginPct: -0.1 // Un margen negativo (-10%) que obligará al precio a bajar
        };

        const result = calculateOperationPrices(inputWithoutMargin);

        // TotalCost = 240
        // TargetPrice = 240 / (1 - (-0.1)) = 240 / 1.1 = 218.18...
        // Benefit = 218.18 - 240 = -21.82
        expect(result.totalCost).toBe(240);
        expect(result.targetPrice).toBeCloseTo(240 / 1.1, 2);
        expect(result.expectedBenefit).toBeLessThan(0);

        expect(result.corporateTax).toBe(0);
        expect(result.legalReserve).toBe(0);
        expect(result.netBenefit).toBeCloseTo(result.expectedBenefit, 2);
    });

    it('debería devolver precio infinito (o 0 manejado) si el margen es 100%', () => {
        const input100Margin: OperationInput = {
            ...defaultInput,
            marginPct: 1
        };

        const result = calculateOperationPrices(input100Margin);
        expect(result.targetPrice).toBe(0);
    });
});
