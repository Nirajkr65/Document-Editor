import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const isGeminiConfigured = !!process.env.GEMINI_API_KEY;

let genAI;
if (isGeminiConfigured) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn(
    'WARNING: GEMINI_API_KEY missing in .env. Falling back to mockup mode for AI features.'
  );
}

/**
 * Summarizes the document content.
 * @param {string} content
 * @returns {Promise<string>} bulleted summary text
 */
export const generateAISummary = async (content) => {
  if (!content || !content.trim()) {
    throw new Error('Document content is empty');
  }

  if (!isGeminiConfigured) {
    console.log('Using mockup fallback summary.');
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          `**Document Summary (AI Mockup Fallback)**\n\n` +
          `• **Core Subject**: Outlines document design architectures, collaborative real-time editing workflows, and custom formatting toolbar configs.\n` +
          `• **Media Capabilities**: Features Cloudinary integrations supporting file uploads for images (inline rendering) and PDFs (styled hyperlink insertions).\n` +
          `• **Themes & Layouts**: Implements responsive layout breakpoints, toggle drawers for mobile viewports, and light/dark theme switches with local persistence.`
        );
      }, 1000);
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = 
      `You are an AI summarizing assistant. Read the following document and output a clear, concise bullet-point summary. ` +
      `Highlight key themes, decisions, and takeaways. Use clean Markdown styling. Do not include introductory notes or chit-chat:\n\n${content}`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini generateAISummary error:', error);
    throw new Error('Failed to generate AI summary: ' + error.message);
  }
};

/**
 * Provides editing, rewriting, grammar correction or writing assistance on selected text.
 * @param {string} content
 * @param {string} instruction
 * @returns {Promise<string>} refined text output
 */
export const generateAIWritingAssistance = async (content, instruction = '') => {
  if (!content || !content.trim()) {
    throw new Error('No text content provided for AI assistance');
  }

  if (!isGeminiConfigured) {
    console.log('Using mockup fallback writing assistance.');
    return new Promise((resolve) => {
      setTimeout(() => {
        const words = content.split(' ');
        const snippet = words.slice(0, Math.min(10, words.length)).join(' ') + '...';
        resolve(
          `**AI Writing Refinement (AI Mockup Fallback)**\n` +
          `*Instruction applied: "${instruction || 'Rewrite professionally'}"*\n\n` +
          `**Refined Text**:\n` +
          `"${content.trim()} [Enhanced with a cohesive tone, corrected style flow, and professional formatting refinement by Gemini AI]"\n\n` +
          `*Copy or insert the refined text directly into the document editor.*`
        );
      }, 1200);
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = 
      `You are a professional writing and text refinement assistant integrated into a rich text editor. ` +
      `Modify, expand, format, translate, or rewrite the following text according to the user instruction.\n\n` +
      `User Instruction: "${instruction}"\n\n` +
      `Target Text to refine:\n"""\n${content}\n"""\n\n` +
      `Output ONLY the refined text or the requested response. Do not add quotes, introductory messages, or filler words.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Gemini generateAIWritingAssistance error:', error);
    throw new Error('Failed to obtain AI writing assistance: ' + error.message);
  }
};
