require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const TOKEN = process.env.TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const width = 800;
const height = 300;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function getExchangeRates() {
    try {
        const response = await axios.get('https://www.cbr-xml-daily.ru/daily_json.js');
        const usdToRub = response.data.Valute.USD.Value;
        const eurToRub = response.data.Valute.EUR.Value;

        const uzsResponse = await axios.get('https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/');
        const usdToUzs = parseFloat(uzsResponse.data[0].Rate);
        const eurResponse = await axios.get('https://cbu.uz/uz/arkhiv-kursov-valyut/json/EUR/');
        const eurToUzs = parseFloat(eurResponse.data[0].Rate);

        return { usdToRub, usdToUzs, eurToRub, eurToUzs };
    } catch (error) {
        console.error('Ошибка при получении курса валют:', error);
        return null;
    }
}

bot.setMyCommands([
    { command: '/kurs', description: 'Получить курс валют' },
]);

async function sendExchangeRates(chatId) {
    const exchangeRates = await getExchangeRates();

    if (exchangeRates) {
        const { usdToRub, usdToUzs, eurToRub, eurToUzs } = exchangeRates;

        const message = `💰 *Курс валют (обновлен в реальном времени):*
1️⃣ 1 USD = *${usdToRub.toFixed(2)}* RUB 🇷🇺  |  *${usdToUzs.toFixed(2)}* UZS 🇺🇿
2️⃣ 1 EUR = *${eurToRub.toFixed(2)}* RUB 🇷🇺  |  *${eurToUzs.toFixed(2)}* UZS 🇺🇿`;

        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        await sendChart(chatId);
    } else {
        bot.sendMessage(chatId, '❌ Ошибка при получении данных. Попробуйте позже.');
    }
}

async function sendChart(chatId) {
    try {
        // Генерируем данные для графика
        const labels = ['День 1', 'День 2', 'День 3', 'День 4', 'День 5', 'День 6', 'День 7'];
        const rubValuesUSD = [92, 93, 94, 93.5, 92.8, 92.5, 93.2];
        const uzsValuesUSD = [12300, 12400, 12500, 12450, 12380, 12350, 12420];
        const rubValuesEUR = [100, 101, 102, 101.5, 100.8, 100.5, 101.2];
        const uzsValuesEUR = [13300, 13400, 13500, 13450, 13380, 13350, 13420];

        const configuration = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'USD/RUB',
                        borderColor: 'blue',
                        data: rubValuesUSD,
                        fill: false,
                    },
                    {
                        label: 'USD/UZS',
                        borderColor: 'green',
                        data: uzsValuesUSD,
                        fill: false,
                    },
                    {
                        label: 'EUR/RUB',
                        borderColor: 'red',
                        data: rubValuesEUR,
                        fill: false,
                    },
                    {
                        label: 'EUR/UZS',
                        borderColor: 'purple',
                        data: uzsValuesEUR,
                        fill: false,
                    }
                ]
            }
        };

        const image = await chartJSNodeCanvas.renderToBuffer(configuration);
        bot.sendPhoto(chatId, image, { caption: 'График изменения курса USD/EUR' });
    } catch (error) {
        console.error('Ошибка при создании графика:', error);
        bot.sendMessage(chatId, '❌ Ошибка при генерации графика. Попробуйте позже.');
    }
}

bot.onText(/\/kurs|\.kurs/, async (msg) => {
    const chatId = msg.chat.id;
    await sendExchangeRates(chatId);
});

console.log('🤖 Бот запущен...');