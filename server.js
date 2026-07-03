const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

// Твои данные, которые ты отправлял ранее
const token = '7729440620:AAGY_Z3LhR3r9L1Wq8M2K9P5v4X8Y7Z2l1A';
const mongoUri = 'mongodb+srv://janbolat:Astana2026@cluster0.wh83m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const bot = new TelegramBot(token, { polling: true });
const client = new MongoClient(mongoUri);

let db, productsCollection;
const userStates = {};

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
            // Берем самую большую по размеру картинку из массива Telegram
            const photoId = msg.photo[msg.photo.length - 1].file_id;
            
            try {
                // Прямое сохранение в базу данных без скачивания на диск
                await productsCollection.insertOne({
                    name: state.name,
                    price: state.price,
                    description: state.description,
                    photo: photoId, // Сохраняем ID картинки
                    createdAt: new Date()
                });

                bot.sendMessage(chatId, `🎉 Товар успешно сохранен в базу MongoDB!\n\n📦 Название: ${state.name}\n💰 Цена: ${state.price} ₸`);
                delete userStates[chatId];
            } catch (err) {
                bot.sendMessage(chatId, "Ошибка сохранения в базу данных MongoDB.");
                console.error(err);
            }
        } else {
            bot.sendMessage(chatId, "Пожалуйста, отправь именно ФОТОГРАФИЮ (сжатое изображение).");
        }
    }
});
