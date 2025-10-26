import { GoogleGenAI, Modality } from "@google/genai";
import type { BatchCallbackPayload } from '../types';

/**
 * Serviço de geração de variações de imagem a partir de uma foto de referência.
 * Mantém o produto idêntico e produz 10 ângulos profissionais para cardápio.
 *
 * Observações:
 * - Mantém compatibilidade com as assinaturas originais exportadas.
 * - Melhora validações, tratamento de erros e legibilidade.
 */

// -------------- Config e utilidades --------------

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY not defined in environment variables. Please set your Gemini API key.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper function to retry API calls on failure with exponential backoff
const generateContentWithRetry = async (
  params: Parameters<typeof ai.models.generateContent>[0],
  retries = 3,
  delay = 1000
): Promise<ReturnType<typeof ai.models.generateContent>> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      console.warn(`Attempt ${i + 1} of ${retries} failed. Retrying in ${delay * (i + 1)}ms...`, error);
      if (i === retries - 1) {
        // Last attempt failed, re-throw the error to be caught by the caller.
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // simple exponential backoff
    }
  }
  // This line should be unreachable due to the throw in the loop
  throw new Error("Retry logic completed without success or error.");
};


// Modelo default
const DEFAULT_MODEL_ID = "gemini-2.5-flash-image";

// Conjunto de instruções base (sempre incluídas)
const BASE_INSTRUCTIONS =
  "Fundamental: Preserve exactly the visual identity of the reference object—shape/geometry, relative dimensions, colors, materials, texture, labels/logos, and any existing text. Do not add, remove, or rearrange parts; do not alter colors, finishes, gloss, labels, typography, or proportions. For reflective or transparent materials (glass/metal/plastic), maintain soft, controlled highlights without hotspots and without reflecting invented environments. The result must be a high-quality photograph for a catalog/e-commerce, rendered in a 1080x1080 pixel square format.";

// Lista negativa aplicada a todas as gerações (ajuda a evitar drift)
const NEGATIVE_PROMPT =
  "Avoid: additional elements/props, color changes, deformations, excessive specular highlights, blown-out brightness, harsh shadows, people/hands, extra surfaces, new or altered texts/logos, perspective distortions, incomplete cutouts, patterned backgrounds, watermarks.";

// Helper para compor o prompt final
const composePrompt = (anglePrompt: string): string => `${anglePrompt} ${BASE_INSTRUCTIONS} ${NEGATIVE_PROMPT}`;

// Sanitiza Base64 removendo prefixo de data URL, se houver
const sanitizeBase64 = (data: string): string => data.split(",")[1] || data;

// Valida o MIME type de entrada
const isSupportedImageMime = (mime: string): boolean => /^(image\/(png|jpeg|jpg|webp))$/i.test(mime);

// Extrai o primeiro base64 de imagem presente no candidato
const extractBase64FromCandidate = (candidate: any): string | null => {
  if (!candidate?.content?.parts) return null;
  for (const part of candidate.content.parts) {
    if (part?.inlineData?.data) return part.inlineData.data as string;
  }
  return null;
};

// -------------- Prompts detalhados (10 ângulos) --------------

export const detailedAnglePrompts: readonly string[] = [
  composePrompt(
    "Generate an image of the product at a three-quarter left angle (≈45°). Neutral background (white or light-gray), continuous studio lighting, soft and realistic discreet shadow. Preserve shape, colors, materials, and labels exactly as the reference. No props."
  ),
  composePrompt(
    "Generate a frontal image with the camera at the object's height, natural perspective (no wide-angle exaggeration), matte white background, slight DOF to highlight the product. Existing labels and texts must remain legible and unchanged."
  ),
  composePrompt(
    "Generate an image of the product seen exactly from above (90°), central framing, neutral white background, diffuse light, no hotspots. Preserve geometry and proportions as per the reference."
  ),
  composePrompt(
    "Generate an image at the three-quarter right angle (≈45°), same soft studio lighting, coherent shadow. Maintain identical visual identity and proportions to the reference."
  ),
  composePrompt(
    "Generate a moderate close-up highlighting the main material/texture or relevant area (e.g., surface, label, finish). Keep colors, typography, and micro-details faithful to the reference. Slightly blurred neutral background."
  ),
  composePrompt(
    "Generate an image from a low angle, looking slightly up at the product, making it look imposing. Neutral studio background, soft lighting to avoid harsh shadows. Maintain exact proportions."
  ),
  composePrompt(
    "Generate an image from a high three-quarter angle, looking down at the product (hero shot perspective). Clean, neutral background. Lighting should emphasize the top surfaces. No distortion."
  ),
  composePrompt(
    "Generate an image showing the back of the product, maintaining the same studio lighting. This is useful for showing details on the reverse side. Colors and geometry must be identical to the reference."
  ),
  composePrompt(
    "Generate a dramatic shot with high-contrast 'chiaroscuro' lighting. Light and shadow should play across the product's surface to emphasize its form and texture. The background should be very dark (dark gray, not pure black)."
  ),
  composePrompt(
    "Generate an image of the product on a simple, elegant, clean, neutral surface that complements the product, like a polished concrete slab or a light wood board. The background must be a simple, out-of-focus studio wall."
  )
] as const;


// -------------- Núcleo de geração --------------

/**
 * Gera uma única variação de imagem a partir de uma imagem base e de um prompt específico de ângulo.
 */
export const generateSingleImageVariation = async (
  base64Data: string,
  mimeType: string,
  prompt: string,
  options?: { modelId?: string }
): Promise<string> => {
  if (!isSupportedImageMime(mimeType)) {
    throw new Error(
      `Unsupported MIME type: ${mimeType}. Use PNG, JPEG, or WEBP.`
    );
  }

  const modelId = options?.modelId || DEFAULT_MODEL_ID;
  const sanitizedBase64 = sanitizeBase64(base64Data);

  const response = await generateContentWithRetry({
    model: modelId,
    contents: {
      parts: [
        {
          inlineData: {
            data: sanitizedBase64,
            mimeType,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  const candidate = response.candidates?.[0];

  if (!candidate) {
    const reason = response.promptFeedback?.blockReason;
    if (reason) throw new Error(`Generation blocked. Reason: ${reason}.`);
    throw new Error("The API response does not contain any valid candidates.");
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    if (candidate.finishReason === "SAFETY") {
      const blockedRating = candidate.safetyRatings?.find((r: any) => r.blocked);
      const category = blockedRating ? ` Category: ${blockedRating.category}` : "";
      throw new Error(`Generation blocked for safety reasons.${category}`);
    }
    throw new Error(`Generation failed. Reason: ${candidate.finishReason}.`);
  }

  const base64Out = extractBase64FromCandidate(candidate);
  if (!base64Out) {
    throw new Error("No image data found in the API response.");
  }

  return base64Out; // returns only the raw base64 (without data URL prefix)
};

/**
 * Gera um número específico de variações em lotes e emite resultados parciais via callback.
 */
export const generateImageVariations = async (
  base64Data: string,
  mimeType: string,
  numToGenerate: number,
  onBatchComplete: (result: BatchCallbackPayload) => void,
  options?: {
    batchSize?: number; 
    modelId?: string;
  }
): Promise<void> => {
  
  // --- MOCK MODE ---
  // To enable, open the browser console and type: window.MOCK_GENERATION = true
  if ((window as any).MOCK_GENERATION === true) {
    console.warn("--- MOCK GENERATION ENABLED ---");
    const batchSize = options?.batchSize ?? 5;
    for (let i = 0; i < numToGenerate; i += batchSize) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      const batchCount = Math.min(batchSize, numToGenerate - i);
      const successes = Array(batchCount).fill(base64Data); // Use original image as mock
      onBatchComplete({ successes, failures: [] });
    }
    return;
  }
  // --- END MOCK MODE ---
  
  const sanitizedBase64 = sanitizeBase64(base64Data);
  const batchSize = options?.batchSize ?? 5;
  const modelId = options?.modelId || DEFAULT_MODEL_ID;

  const promptsToRun = detailedAnglePrompts.slice(0, numToGenerate);

  for (let i = 0; i < promptsToRun.length; i += batchSize) {
    const batchPrompts = promptsToRun.slice(i, i + batchSize);

    const imagePromises = batchPrompts.map((prompt) =>
      generateSingleImageVariation(sanitizedBase64, mimeType, prompt, { modelId })
    );

    const results = await Promise.allSettled(imagePromises);

    const successes: string[] = [];
    const failures: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successes.push(`data:image/png;base64,${result.value}`);
      } else {
        const rawErrorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
        let friendlyErrorMessage = rawErrorMessage;

        try {
            const errorObj = JSON.parse(rawErrorMessage);
            if (errorObj.error?.message) {
                 friendlyErrorMessage = "Ocorreu um erro no servidor. Por favor, tente novamente.";
            }
        } catch (e) {
            // Not JSON, check for common string patterns
            const lowerCaseError = rawErrorMessage.toLowerCase();
            if (lowerCaseError.includes("safety")) {
                friendlyErrorMessage = "A geração foi bloqueada por motivos de segurança.";
            } else if (lowerCaseError.includes("blocked")) {
                friendlyErrorMessage = "A geração foi bloqueada por um motivo não especificado.";
            } else if (lowerCaseError.includes("network") || lowerCaseError.includes("failed to fetch")) {
                friendlyErrorMessage = "Falha de rede. Verifique sua conexão com a internet.";
            }
        }

        console.error(
          JSON.stringify({
            msg: "Failed to generate variation",
            angleIndex: i + index,
            error: rawErrorMessage,
          })
        );
        failures.push(`Variação ${i + index + 1}: ${friendlyErrorMessage}`);
      }
    });

    onBatchComplete({ successes, failures });
  }
};