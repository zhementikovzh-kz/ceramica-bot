const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const http = require('http');

// Обновленный токен и твоя база данных
const token = '8774614622:AAG1gYJ_UDdHn5zllst-gtLdNRPr_aHyXOM';
const mongoUri = "mongodb+srv://zhementikovzh_db_user:Astana2026@cluster0.wh83m.mongodb.net/ceramica_shop";
const bot = new TelegramBot(token, { polling: true });
const client = new MongoClient(mongoUri);

let db = null;
let productsCollection = null;
const userStates = {};

// Создаем сервер-заглушку для Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Сервер-заглушка слушает порт ${PORT}`);
});

// Подключаемся к базе данных
async function connectDB() {
    try {
        await client.connect();
        db = client.db('ceramica_shop');
        productsCollection = db.collection('products');
        console.log('Успешно подключились к MongoDB!');
    } catch (err) {
        console.error('Ошибка подключения к базе:', err);
    }
}
connectDB();

bot.onText(/\/add_product/, (msg) => {
    const chatId = msg.chat.id;
    userStates[chatId] = { step: 1 };
    bot.sendMessage(chatId, "Шаг 1: Введи название материала (например: Натуральный Гранит 'Gold Star'):");
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const state = userStates[chatId];

    if (!state || msg.text === '/add_product') return;

    if (!productsCollection) {
        bot.sendMessage(chatId, "⏳ Подожди секунду, база данных еще подключается. Попробуй отправить сообщение снова.");
        return;
    }

    if (state.step === 1) {
        state.name = msg.text;
        state.step = 2;
        bot.sendMessage(chatId, "Шаг 2: Введи цену материала в тенге (только цифры, например: 35000):");
    } 
    else if (state.step === 2) {
        state.price = msg.text;
        state.step = 3;
        bot.sendMessage(chatId, "Шаг 3: Введи описание материала (размер, матовая/глянцевая, страна):");
    } 
    else if (state.step === 3) {
        state.description = msg.text;
        state.step = 4;
        bot.sendMessage(chatId, "Шаг 4: Прикрепи и отправь ФОТОГРАФИЮ материала:");
    } 
    else if (state.step === 4) {
        if (msg.photo) {
            const photoId = msg.photo[msg.photo.length - 1].file_id;
            
            try {
                await productsCollection.insertOne({
                    name: state.name,
                    price: state.price,
                    description: state.description,
                    photo: photoId,
                    createdAt: new Date()
                });

                bot.sendMessage(chatId, `🎉 Товар успешно сохранен в базу MongoDB!\n\n📦 Название: ${state.name}\n💰 Цена: ${state.price} ₸`);
                delete userStates[chatId];
            } catch (err) {
                bot.sendMessage(chatId, "Ошибка保存 в базу данных MongoDB.");
                console.error(err);
            }
        } else {
            bot.sendMessage(chatId, "Пожалуйста, отправь именно ФОТОГРАФИЮ (сжатое изображение).");
        }
    }
});
