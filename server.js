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

function renderPage(content = '', options = [], selectedAuthor = '') {
  const optionsHtml = options.map(option =>
    `<option value="${option}" ${option === selectedAuthor ? 'selected' : ''}>${option}</option>`
  ).join('');

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Электронный научный журнал</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f5f7fa;
      color: #333;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      background-color: #fff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      text-align: center;
      color: #2c3e50;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    input[type="text"], select {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    button {
      padding: 8px 16px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: #2980b9;
    }
    .btn-list {
      background-color: #27ae60;
    }
    .btn-list:hover {
      background-color: #219a52;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    .no-data {
      text-align: center;
      padding: 30px;
      color: #7f8c8d;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Научный журнал</h1>
    <div class="controls">
      <form action="/" method="GET" class="control-group">
        <button type="submit" class="btn-list">Список статей</button>
      </form>
      <form action="/search/title" method="POST" class="control-group">
        <input type="text" name="titleQuery" placeholder="Введите текст для поиска..." required>
        <button type="submit">Поиск по названию</button>
      </form>
      <form action="/search/author" method="POST" class="control-group">
        <select name="authorQuery">
          <option value="">-- Выберите автора --</option>
          ${optionsHtml}
        </select>
        <button type="submit">Поиск по автору</button>
      </form>
    </div>
    <div class="content">
      ${content}
    </div>
  </div>
</body>
</html>`;
}

function renderArticlesTable(articlesData) {
  if (!articlesData || articlesData.length === 0) {
    return '<div class="no-data">Нет статей для отображения.</div>';
  }

  let tableHtml = `
    <table>
      <thead>
        <tr>
          <th>№</th>
          <th>Название</th>
          <th>Авторы</th>
          <th>Дата размещения</th>
        </tr>
      </thead>
      <tbody>`;

  articlesData.forEach((article, index) => {
    const formattedDate = article.publishDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    tableHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${article.title}</td>
          <td>${article.authors.join(', ')}</td>
          <td>${formattedDate}</td>
        </tr>`;
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
}

app.get('/', async (request, response) => {
  try {
    const allArticles = await articlesCollection.find().sort({ publishDate: -1 }).toArray();
    const authors = await articlesCollection.distinct('authors');
    const allAuthorsSorted = authors.flat().filter((value, index, self) => self.indexOf(value) === index).sort();

    const tableContent = renderArticlesTable(allArticles);
    const pageHtml = renderPage(tableContent, allAuthorsSorted);
    response.send(pageHtml);
  } catch (error) {
    console.error('Ошибка при получении списка статей:', error);
    response.status(500).send('Внутренняя ошибка сервера.');
  }
});

app.listen(port, async () => {
  await connectToDatabase();
  console.log(`Сервер запущен на http://localhost:${port}`);
});
