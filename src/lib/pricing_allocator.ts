// pricing_allocator.ts
import { OperationResult } from './calculator';

export interface AllocatorItemInput {
    id: string;
    unitQuantity: number;
    totalCost: number;     // Coste directo total de este ítem
    isCommonCost: boolean; // Si es true, su coste engorda el total pero no recibe precio de venta propio
}

export interface AllocatedItemPrice {
    itemId: string;
    unitSellingPrice: number;       // PVP sugerido por unidad (sin IVA)
    totalSellingPrice: number;      // PVP sugerido total para esta línea (sin IVA)
    unitSellingPriceWithVAT: number;// PVP sugerido por unidad con IVA (21%)
    totalSellingPriceWithVAT: number;// PVP sugerido total con IVA (21%)
}

/**
 * Reparte el Target Price (Precio Objetivo) de toda la operación
 * entre las líneas de artículos o servicios que NO son costes comunes.
 * El reparto es ponderado según el peso del coste directo del ítem sobre el coste directo de los ítems a la venta.
 */
export function allocateTargetPriceToItems(
    items: AllocatorItemInput[],
    operationResult: OperationResult
): AllocatedItemPrice[] {
    const targetPrice = operationResult.targetPrice;

    // Identificamos las líneas facturables (las comunes como un flete global se prorratean dentro del precio de estas)
    const billableItems = items.filter(i => !i.isCommonCost);

    const totalBillableCost = billableItems.reduce((acc, item) => acc + item.totalCost, 0);

    const allocatedPrices: AllocatedItemPrice[] = [];

    items.forEach(item => {
        // Los costes comunes (ej: Transporte general) no se le enseñan al cliente con PVPs individuales, 
        // su precio se ha diluido y absorbido por los artículos facturables.
        if (item.isCommonCost) {
            allocatedPrices.push({
                itemId: item.id,
                unitSellingPrice: 0,
                totalSellingPrice: 0,
                unitSellingPriceWithVAT: 0,
                totalSellingPriceWithVAT: 0
            });
            return;
        }

        // Si no hay costes facturables, por seguridad (para evitar / 0) dividimos por partes iguales
        // O si el coste de la línea es 0 (algo que damos gratis pero queremos ponerle precio? Mejor asume 0 o proporcional a uniQty)
        let weight = 0;
        if (totalBillableCost > 0) {
            weight = item.totalCost / totalBillableCost;
        } else {
            weight = 1 / billableItems.length;
        }

        const totalSellingPrice = targetPrice * weight;
        const unitSellingPrice = item.unitQuantity > 0 ? totalSellingPrice / item.unitQuantity : 0;

        allocatedPrices.push({
            itemId: item.id,
            unitSellingPrice: unitSellingPrice,
            totalSellingPrice: totalSellingPrice,
            unitSellingPriceWithVAT: unitSellingPrice * 1.21,
            totalSellingPriceWithVAT: totalSellingPrice * 1.21
        });
    });

    return allocatedPrices;
}
