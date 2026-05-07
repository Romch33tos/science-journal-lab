const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

const mongoUri = 'mongodb://127.0.0.1:27017';
const dbName = 'science_journal';

app.use(express.urlencoded({ extended: true }));

let db;
let articlesCollection;

async function connectToDatabase() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Сервер успешно подключился к MongoDB.');
    db = client.db(dbName);
    articlesCollection = db.collection('articles');
  } catch (error) {
    console.error('Ошибка подключения к базе данных:', error);
    process.exit(1);
  }
}

app.listen(port, async () => {
  await connectToDatabase();
  console.log(`Сервер запущен на http://localhost:${port}`);
});
