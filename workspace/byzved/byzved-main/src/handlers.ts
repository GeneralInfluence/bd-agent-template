import { fetchMessages } from "./supabase.js";
import { buildOpenAIPrompt, sendPromptToOpenAI } from "./embeddings.js";
import { sendToGuildGrimoireIngest } from "./guildGrimoireIngest.js";
/**
 * Handle /ask command in private chat to answer questions about all groups/channels/chats
 * Usage: /ask <question>
 */
export async function handleAskCommand(ctx: Context): Promise<void> {
  try {
    // Only allow in private chats
    if (!ctx.chat || ctx.chat.type !== "private") {
      logger.debug(
        `[ASK] Rejected: not private chat. chat.type=${ctx.chat?.type}`
      );
      await ctx.reply(
        "❌ Please use this command in a private chat with the bot."
      );
      return;
    }

    const text = ctx.message?.text || "";
    logger.debug(`[ASK] Received text: '${text}'`);
    // Accepts: /ask <question>
    const match = text.match(/^\/ask\s+([\s\S]+)/i);
    if (!match) {
      logger.debug(`[ASK] Regex did not match. text='${text}'`);
      await ctx.reply("Usage: /ask <your question>");
      return;
    }
    const userQuestion = match[1].trim();

    // Fetch recent messages from all groups/channels/chats
    const messages = await fetchMessages({ limit: 50 }); // No groupId filter
    if (!messages.length) {
      logger.debug(`[ASK] No messages found`);
      await ctx.reply("No messages found.");
      return;
    }

    // Build prompt and query OpenAI
    const prompt = buildOpenAIPrompt(messages, userQuestion);
    logger.debug(`[ASK] Built prompt: ${prompt}`);
    const answer = await sendPromptToOpenAI(prompt);
    logger.debug(`[ASK] OpenAI answer: ${answer}`);

    // Send to Guild Grimoire Ingest API
    try {
      await sendToGuildGrimoireIngest({
        text_content: userQuestion,
        // Optionally add visibility/tag_ids if needed
      });
    } catch (err) {
      logger.error("Failed to send to Guild Grimoire Ingest API:", err);
    }

    await ctx.reply(answer);
  } catch (error) {
    logger.error("Error in handleAskCommand:", error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
}

/**
 * Handle @mention ask in group/channel: considers only messages from that chat
 * Usage: @BotUsername <question>
 */
export async function handleMentionAsk(ctx: Context): Promise<void> {
  try {
    // Only allow in group/channel/supergroup
    if (!ctx.chat || !['group', 'supergroup', 'channel'].includes(ctx.chat.type)) {
      return;
    }
    const text = ctx.message?.text || "";
    const botUsername = ctx.me?.username ? `@${ctx.me.username}` : "";
    // Find @mention entity for the bot
    const mentionEntity = ctx.message?.entities?.find(
      (e: { type: string; offset: number; length: number }) =>
        e.type === "mention" &&
        text.substring(e.offset, e.offset + e.length).toLowerCase() === botUsername.toLowerCase()
    );
    if (!mentionEntity) return;
    // Extract question after the mention
    const question = text.slice(mentionEntity.offset + mentionEntity.length).trim();
    if (!question) {
      await ctx.reply("Please ask a question after mentioning me.");
      return;
    }
    // Fetch recent messages from this group/channel only
    const messages = await fetchMessages({ groupId: ctx.chat.id, limit: 50 });
    if (!messages.length) {
      await ctx.reply("No messages found for this group/channel.");
      return;
    }
    // Build prompt and query OpenAI
    const prompt = buildOpenAIPrompt(messages, question);
    const answer = await sendPromptToOpenAI(prompt);
    await ctx.reply(answer);
  } catch (error) {
    logger.error("Error in handleMentionAsk:", error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
}

/**
 * Menu handlers for Telegram bot commands and interactions
 * Manages all inline keyboard callbacks and menu navigation
 */

import { Context, InlineKeyboard } from "grammy";
import { getMessageCount } from "./supabase.js";
import { areEmbeddingsAvailable, getEmbeddingsProvider } from "./embeddings.js";
import { logger } from "./logger.js";

/**
 * Create the main menu keyboard
 * @returns InlineKeyboard with main menu options
 */
export function getMainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📊 Statistics", "stats")
    .text("ℹ️ About", "about")
    .row()
    .text("🛡️ Privacy", "privacy")
    .text("🗑️ Clear Chats", "clear_chats")
    .row()
    .text("❌ Opt Out", "optout");
}

/**
 * Handle /start command with welcome message and menu
 * @param ctx Grammy context
 */
export async function handleStartCommand(ctx: Context): Promise<void> {
  try {
    const keyboard = getMainMenuKeyboard();

    await ctx.reply(
      `🤖 Welcome to <b>Telegram Ingestion Bot</b>!\n\n` +
        `I monitor public Telegram groups and channels for crypto events data.\n\n` +
        `<b>📊 What I do:</b>\n` +
        `• Capture messages from monitored groups\n` +
        `• Store data in a secure database\n` +
        `• Process for analysis\n\n` +
        `<b>🛡️ Privacy:</b>\n` +
        `• Only public data is collected\n` +
        `• You can opt-out anytime\n\n` +
        `Choose an option below or use commands:`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    logger.error("Error in handleStartCommand:", error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
}

/**
 * Handle /optout command with confirmation dialog
 * @param ctx Grammy context
 */
export async function handleOptoutCommand(ctx: Context): Promise<void> {
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply("❌ Could not determine your user ID.");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("✅ Yes, opt out", "confirm_optout")
      .text("❌ Cancel", "cancel");

    await ctx.reply(
      "⚠️ Are you sure you want to opt out? Your future messages will no longer be collected.",
      {
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    logger.error("Error in handleOptoutCommand:", error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
}

/**
 * Handle /stats command with current statistics
 * @param ctx Grammy context
 */
export async function handleStatsCommand(ctx: Context): Promise<void> {
  try {
    const count = await getMessageCount();
    const provider = getEmbeddingsProvider();
    const embeddingsStatus = areEmbeddingsAvailable()
      ? `✅ Enabled (${provider})`
      : "⚠️ Disabled";

    await ctx.reply(
      `📊 <b>Bot Statistics</b>\n\n` +
        `Total messages ingested: <code>${count}</code>\n` +
        `Embeddings: ${embeddingsStatus}`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().text("🔙 Back to Menu", "main_menu"),
      }
    );
  } catch (error) {
    logger.error("Error in handleStatsCommand:", error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
}

/**
 * Handle callback query for menu interactions
 * Routes to appropriate handler based on callback data
 * @param ctx Grammy context
 */
export async function handleCallbackQuery(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;

  if (!data) {
    await ctx.answerCallbackQuery("❌ Unknown action");
    return;
  }

  try {
    switch (data) {
      case "stats":
        await handleStatsCallback(ctx);
        break;
      case "about":
        await handleAboutCallback(ctx);
        break;
      case "privacy":
        await handlePrivacyCallback(ctx);
        break;
      case "optout":
        await handleOptoutCallback(ctx);
        break;
      case "confirm_optout":
        await handleConfirmOptoutCallback(ctx);
        break;
      case "clear_chats":
        await handleClearChatsCallback(ctx);
        break;
      case "confirm_clear_chats":
        await handleConfirmClearChatsCallback(ctx);
        break;
      case "cancel":
        await handleCancelCallback(ctx);
        break;
      case "main_menu":
        await handleMainMenuCallback(ctx);
        break;
      default:
        await ctx.answerCallbackQuery("❌ Unknown action");
    }
  } catch (error) {
    logger.error("Error handling callback query:", error);
    await ctx.answerCallbackQuery("❌ An error occurred");
  }
}

/**
 * Handle stats callback
 * @param ctx Grammy context
 * @private
 */
async function handleStatsCallback(ctx: Context): Promise<void> {
  const count = await getMessageCount();
  const provider = getEmbeddingsProvider();
  const embeddingsStatus = areEmbeddingsAvailable()
    ? `✅ Enabled (${provider})`
    : "⚠️ Disabled";

  await ctx.editMessageText(
    `📊 <b>Bot Statistics</b>\n\n` +
      `Total messages ingested: <code>${count}</code>\n` +
      `Embeddings: ${embeddingsStatus}`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🔙 Back to Menu", "main_menu"),
    }
  );
  await ctx.answerCallbackQuery("📊 Statistics updated");
}

/**
 * Handle about callback
 * @param ctx Grammy context
 * @private
 */
async function handleAboutCallback(ctx: Context): Promise<void> {
  await ctx.editMessageText(
    `ℹ️ <b>About Telegram Ingestion Bot</b>\n\n` +
      `<b>Version:</b> 0.1.0\n` +
      `<b>Purpose:</b> Ingest and analyze crypto event conversations\n\n` +
      `<b>Features:</b>\n` +
      `• Real-time message ingestion\n` +
      `• Vector embeddings (OpenAI/Gemini)\n` +
      `• Secure Supabase storage\n` +
      `• User privacy controls\n` +
      `• Opt-out support\n\n` +
      `<b>Status:</b> Active & Running ✅`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🔙 Back to Menu", "main_menu"),
    }
  );
  await ctx.answerCallbackQuery("ℹ️ About info loaded");
}

/**
 * Handle privacy callback
 * @param ctx Grammy context
 * @private
 */
async function handlePrivacyCallback(ctx: Context): Promise<void> {
  await ctx.editMessageText(
    `🛡️ <b>Privacy Policy</b>\n\n` +
      `<b>Data Collection:</b>\n` +
      `• Only public group messages\n` +
      `• User metadata (name, ID)\n` +
      `• Timestamps and content\n\n` +
      `<b>Data Usage:</b>\n` +
      `• Analysis and insights\n` +
      `• Pattern recognition\n` +
      `• Trend identification\n\n` +
      `<b>Your Rights:</b>\n` +
      `• Opt-out anytime with /optout\n` +
      `• No tracking of opted-out users\n` +
      `• Transparent data handling\n\n` +
      `<b>Security:</b>\n` +
      `• Encrypted storage (Supabase)\n` +
      `• No third-party sharing`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🔙 Back to Menu", "main_menu"),
    }
  );
  await ctx.answerCallbackQuery("🛡️ Privacy policy loaded");
}

/**
 * Handle optout callback - shows confirmation
 * @param ctx Grammy context
 * @private
 */
async function handleOptoutCallback(ctx: Context): Promise<void> {
  const keyboard = new InlineKeyboard()
    .text("✅ Yes, opt out", "confirm_optout")
    .text("❌ Cancel", "cancel");

  await ctx.editMessageText(
    "⚠️ <b>Opt Out Confirmation</b>\n\n" +
      "Are you sure you want to opt out?\n" +
      "Your future messages will no longer be collected.",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery();
}

/**
 * Handle confirm optout callback - actually performs opt-out
 * @param ctx Grammy context
 * @private
 */
async function handleConfirmOptoutCallback(ctx: Context): Promise<void> {
  const { addUserOptOut } = await import("./supabase.js");

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCallbackQuery("❌ Error: Could not determine user ID");
    return;
  }

  const success = await addUserOptOut(userId);
  if (success) {
    await ctx.editMessageText(
      `✅ <b>Opt-Out Confirmed</b>\n\n` +
        `You have been successfully opted out.\n` +
        `Your messages will no longer be collected.`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().text("🏠 Main Menu", "main_menu"),
      }
    );
    await ctx.answerCallbackQuery("✅ You have been opted out");
  } else {
    await ctx.answerCallbackQuery("❌ Failed to opt out. Please try again.");
  }
}

/**
 * Handle cancel callback - returns to confirmation dialog
 * @param ctx Grammy context
 * @private
 */
async function handleCancelCallback(ctx: Context): Promise<void> {
  await ctx.editMessageText("❌ Action cancelled", {
    reply_markup: new InlineKeyboard().text("🏠 Main Menu", "main_menu"),
  });
  await ctx.answerCallbackQuery();
}

/**
 * Handle main menu callback - returns to main menu
 * @param ctx Grammy context
 * @private
 */
async function handleMainMenuCallback(ctx: Context): Promise<void> {
  const keyboard = getMainMenuKeyboard();
  await ctx.editMessageText(`🤖 <b>Main Menu</b>\n\n` + `Choose an option:`, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
}

/**
 * Handle clear chats callback - shows confirmation
 * @param ctx Grammy context
 * @private
 */
async function handleClearChatsCallback(ctx: Context): Promise<void> {
  const keyboard = new InlineKeyboard()
    .text("✅ Yes, clear all", "confirm_clear_chats")
    .text("❌ Cancel", "cancel");

  await ctx.editMessageText(
    "⚠️ <b>Clear Chats Confirmation</b>\n\n" +
      "Are you sure you want to clear all your chat history?\n" +
      "This action cannot be undone.",
    {
      parse_mode: "HTML",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery();
}

/**
 * Handle confirm clear chats callback - actually performs the clearing
 * @param ctx Grammy context
 * @private
 */
async function handleConfirmClearChatsCallback(ctx: Context): Promise<void> {
  const { clearUserMessages } = await import("./supabase.js");

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCallbackQuery("❌ Error: Could not determine user ID");
    return;
  }

  const deletedCount = await clearUserMessages(userId);
  await ctx.editMessageText(
    `✅ <b>Chats Cleared</b>\n\n` +
      `Successfully deleted ${deletedCount} message(s) from your chat history.`,
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🏠 Main Menu", "main_menu"),
    }
  );
  await ctx.answerCallbackQuery("✅ Chat history cleared");
}
