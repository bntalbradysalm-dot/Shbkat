
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: 'AIzaSyA7TYAHxiX0qhhJpdg-_WiCbTl1nTsbznQ',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
