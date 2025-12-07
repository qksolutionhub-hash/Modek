import { GoogleGenAI } from "@google/genai";

export const checkApiKey = async (): Promise<boolean> => {
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const promptApiKeySelection = async () => {
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  } else {
    alert("AI Studio environment not detected. Please run this in the Google AI Studio IDX or similar environment.");
  }
};

export const generateVeoVideo = async (
  prompt: string,
  imageBase64: string | null,
  aspectRatio: '16:9' | '9:16' = '16:9',
  onStatusUpdate: (status: string) => void
): Promise<string> => {
  try {
    const apiKeyValid = await checkApiKey();
    if (!apiKeyValid) {
      await promptApiKeySelection();
      // Proceed without throwing, assuming key selection was successful as per guidelines.
    }

    // Always create a new instance to get the fresh key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    onStatusUpdate("Initializing video generation...");

    const model = 'veo-3.1-fast-generate-preview';
    
    let operation;

    if (imageBase64) {
      // Remove header if present (e.g., "data:image/png;base64,")
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      
      operation = await ai.models.generateVideos({
        model,
        prompt: prompt || "Animate this scene naturally.",
        image: {
          imageBytes: cleanBase64,
          mimeType: 'image/jpeg', // Assuming jpeg/png, Veo is flexible with standard image types
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p', // fast-generate supports 720p
          aspectRatio: aspectRatio
        }
      });
    } else {
       // Text to video only
       operation = await ai.models.generateVideos({
        model,
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
       });
    }

    onStatusUpdate("Video generation in progress. This may take a minute...");

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      onStatusUpdate("Still processing...");
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
      throw new Error(operation.error.message || "Unknown error during video generation");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
        throw new Error("No video URI returned from the API.");
    }

    onStatusUpdate("Fetching final video...");
    // Must append API key to fetch the actual video binary
    const finalUrl = `${videoUri}&key=${process.env.API_KEY}`;
    
    return finalUrl;

  } catch (error: any) {
    console.error("Veo Generation Error:", error);
    throw error;
  }
};