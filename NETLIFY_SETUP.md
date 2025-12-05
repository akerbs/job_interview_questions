# Инструкция по развертыванию на Netlify

Это руководство поможет вам развернуть Telegram бота для подготовки к собеседованиям на Netlify.

## Предварительные требования

1. Аккаунт на [Netlify](https://www.netlify.com/)
2. Аккаунт на [Telegram](https://telegram.org/) и созданный бот через [@BotFather](https://t.me/botfather)
3. GitHub репозиторий с проектом (уже настроен: https://github.com/akerbs/job_interview_questions)

## Шаг 1: Подготовка проекта

Убедитесь, что проект готов к развертыванию:

```bash
cd cursor/react-interview-bot
npm install
npm run build
```

## Шаг 2: Развертывание на Netlify

### Вариант A: Через Netlify Dashboard (рекомендуется)

1. Войдите в [Netlify Dashboard](https://app.netlify.com/)
2. Нажмите **Add new site** → **Import an existing project**
3. Выберите **GitHub** и авторизуйтесь
4. Выберите репозиторий `akerbs/job_interview_questions`
5. Настройки сборки:
   - **Base directory**: `cursor/react-interview-bot`
   - **Build command**: `npm run build`
   - **Publish directory**: `.` (или оставьте пустым)
6. Нажмите **Deploy site**

### Вариант B: Через Netlify CLI

```bash
# Установите Netlify CLI
npm install -g netlify-cli

# Войдите в Netlify
netlify login

# Перейдите в директорию проекта
cd cursor/react-interview-bot

# Инициализируйте сайт
netlify init

# Разверните
netlify deploy --prod
```

## Шаг 3: Настройка переменных окружения

В Netlify Dashboard:

1. Перейдите в ваш сайт → **Site settings** → **Environment variables**
2. Добавьте следующие переменные:
   - `BOT_TOKEN` - токен вашего Telegram бота (получите у @BotFather)
   - `LOG_LEVEL` (опционально) - уровень логирования (по умолчанию: info)
   - `NODE_ENV` - установите в `production`

**Важно:** После добавления переменных окружения нужно **пересобрать сайт**:
- Перейдите в **Deploys** → **Trigger deploy** → **Deploy site**

## Шаг 4: Настройка Webhook в Telegram

После развертывания получите URL вашего сайта (например: `https://your-site.netlify.app`)

1. Установите webhook через Telegram Bot API:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://your-site.netlify.app/webhook"}'
   ```

2. Или используйте браузер:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-site.netlify.app/webhook
   ```

3. Проверьте, что webhook установлен:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

   Должен вернуться ответ с вашим URL:
   ```json
   {
     "ok": true,
     "result": {
       "url": "https://your-site.netlify.app/webhook",
       "has_custom_certificate": false,
       "pending_update_count": 0
     }
   }
   ```

## Шаг 5: Проверка работы

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Бот должен ответить приветственным сообщением с главным меню

## Устранение неполадок

### Бот не отвечает

1. Проверьте логи в Netlify Dashboard:
   - **Functions** → **webhook** → **Logs**
   - Или **Deploys** → выберите последний деплой → **Function logs**

2. Убедитесь, что webhook установлен правильно:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

3. Проверьте переменные окружения в Netlify:
   - Убедитесь, что `BOT_TOKEN` установлен
   - После изменения переменных пересоберите сайт

4. Проверьте, что функция webhook доступна:
   - Откройте в браузере: `https://your-site.netlify.app/.netlify/functions/webhook`
   - Должна вернуться ошибка 405 (Method not allowed) - это нормально, значит функция работает

### Ошибки сборки

1. Проверьте логи сборки в Netlify Dashboard → **Deploys**
2. Убедитесь, что все зависимости установлены
3. Проверьте, что `npm run build` выполняется успешно локально:
   ```bash
   cd cursor/react-interview-bot
   npm run build
   ```

### Ошибки в функции

1. Проверьте логи функций в Netlify Dashboard
2. Убедитесь, что TypeScript компилируется без ошибок
3. Проверьте, что все импорты корректны

## Отключение webhook (возврат к polling)

Если нужно вернуться к локальному запуску:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

Затем запустите локально:
```bash
cd cursor/react-interview-bot
npm run dev
```

## Автоматическое развертывание

После настройки через Git, каждый push в `main` ветку будет автоматически разворачивать новую версию бота.

## Дополнительные ресурсы

- [Документация Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Документация Telegram Bot API](https://core.telegram.org/bots/api)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

