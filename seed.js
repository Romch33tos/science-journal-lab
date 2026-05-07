const { MongoClient } = require('mongodb');

const mongoUri = 'mongodb://127.0.0.1:27017';
const dbName = 'science_journal';

async function seedDatabase() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Подключение к MongoDB установлено.');

    const db = client.db(dbName);
    const articlesCollection = db.collection('articles');

    await articlesCollection.deleteMany({});
    console.log('Существующие документы удалены.');

  } catch (error) {
    console.error('Ошибка при заполнении базы данных:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Соединение с MongoDB закрыто.');
  }
}

seedDatabase();
