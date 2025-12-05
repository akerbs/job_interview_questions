import { z } from 'zod';

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN обязателен. Получите токен у @BotFather в Telegram и добавьте его в файл .env'),
  LOG_LEVEL: z.string().default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let env: EnvConfig;

try {
  env = envSchema.parse({
    BOT_TOKEN: process.env.BOT_TOKEN,
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Ошибка конфигурации:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\n💡 Создайте файл .env в корне проекта и добавьте:');
    console.error('   BOT_TOKEN=your_telegram_bot_token_here');
    console.error('   LOG_LEVEL=info');
    process.exit(1);
  }
  throw error;
}

export { env };

