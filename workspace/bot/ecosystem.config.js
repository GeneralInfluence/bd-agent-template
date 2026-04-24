module.exports = {
  apps: [{
    name: 'lead-agent-bot',
    script: 'bot.js',
    env: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
      SUPABASE_URL: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY',
      BD_STEWARD_TELEGRAM_ID: process.env.BD_STEWARD_TELEGRAM_ID || 'YOUR_STEWARD_TELEGRAM_ID',
      ORG_NAME: process.env.ORG_NAME || 'YourOrg',
      PRISM_API_URL: process.env.PRISM_API_URL || 'YOUR_PRISM_API_URL',
      PRISM_API_KEY: process.env.PRISM_API_KEY || 'YOUR_PRISM_API_KEY',
    }
  }]
};
