import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: 'La API Key de Gemini (GEMINI_API_KEY) no está configurada en el servidor.' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { items, clientName, name } = body;

        // Build a prompt that asks Gemini to act as a financial controller
        const prompt = `
Eres un Controller Financiero experto en fijación de precios (Pricing) corporativos B2B para la empresa 'NAUDEA DEPORTE INTEGRAL S.L', especializada en servicios deportivos, eventos físicos y gestión de instalaciones.
El usuario está cotizando una nueva operación / presupuesto:
- Nombre: "${name || 'Operación sin nombre'}"
- Cliente: "${clientName || 'No especificado'}"

Estos son los costes directos (Escandallo) previstos:
${JSON.stringify(items, null, 2)}

Basado en tu experiencia en el sector y en la estructura de estos costes directos:
1. ¿Qué 'Margen Comercial Esperado' (marginPct) recomendarías pedir? (Suele estar entre 15% y 40% dependiendo de la dificultad y volumen).
2. ¿Qué porcentaje de imputación de costes de estructura/'Overhead' (overheadPct) es razonable para este tipo de proyecto? (Suele ser entre 10% y 25%).
3. ¿Qué porcentaje de riesgo/desviación (riskPct) asignarías? (Si hay muchos materiales físicos importados o mano de obra al exterior, el riesgo sube; si es consultoría pura, el riesgo es nulo o bajo).

Justifica brevemente tus decisiones técnicas para ayudar al comercial a entender por qué exiges estos parámetros. Sé estricto y profesional.
`;

        // Initialize the model with Structured Outputs for precise JSON responses
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        suggestedMarginPct: {
                            type: SchemaType.NUMBER,
                            description: "Suggested margin percentage as a decimal (e.g., 0.20 for 20%)"
                        },
                        suggestedOverheadPct: {
                            type: SchemaType.NUMBER,
                            description: "Suggested overhead percentage as a decimal (e.g., 0.15 for 15%)"
                        },
                        suggestedRiskPct: {
                            type: SchemaType.NUMBER,
                            description: "Suggested risk percentage as a decimal (e.g., 0.05 for 5%)"
                        },
                        reasoning: {
                            type: SchemaType.STRING,
                            description: "Brief professional explanation of why these percentages were selected"
                        }
                    },
                    required: ["suggestedMarginPct", "suggestedOverheadPct", "suggestedRiskPct", "reasoning"],
                },
            }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in AI Controller:', error);
        return NextResponse.json(
            { error: 'Error al contactar con el AI Controller Financiero.' },
            { status: 500 }
        );
    }
}
