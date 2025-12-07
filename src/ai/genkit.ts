
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Note: Replace "YOUR_API_KEY_HERE" with your actual Gemini API key.
// This is a temporary workaround for server environment variable issues.
const GEMINI_API_KEY = "YOUR_API_KEY_HERE";

export const ai = genkit({
  plugins: [googleAI({
    apiKey: GEMINI_API_KEY || process.env.GEMINI_API_KEY
  })],
  model: 'googleai/gemini-2.5-flash',
});
