import { generateFinancialChatResponse } from '../services/ai.service.js';

/**
 * POST /api/ai/chat
 * Send a message to the Gemini-powered AI Financial Assistant with contextual user records
 */
export async function chatWithFinancialAssistant(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access the AI Financial Assistant.',
      });
    }

    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty question or message.',
      });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 1000 characters.',
      });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];

    const result = await generateFinancialChatResponse(userId, trimmedMessage, safeHistory);

    if (!result.success) {
      // If API key is not configured, send a 503 Service Unavailable with friendly message
      const statusCode = result.configured === false ? 503 : 500;
      return res.status(statusCode).json({
        success: false,
        configured: result.configured !== false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      configured: result.configured !== false,
      reply: result.reply,
      model: result.model,
    });
  } catch (error) {
    next(error);
  }
}
