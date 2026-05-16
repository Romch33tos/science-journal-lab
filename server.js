const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const PORT = 3000;

const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'science_journal';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let db;
let articlesCollection;

async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Сервер успешно подключился к MongoDB.');
    db = client.db(DB_NAME);
    articlesCollection = db.collection('articles');
  } catch (error) {
    console.error('Ошибка подключения к базе данных:', error);
    process.exit(1);
  }
}

function calculateAverageRating(article) {
  if (!article.reviews || article.reviews.length === 0) {
    return 0;
  }
  const sum = article.reviews.reduce((total, review) => total + review.rating, 0);
  return sum / article.reviews.length;
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
      max-width: 1200px;
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
    input[type="text"], input[type="date"], select, textarea {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }
    textarea {
      resize: vertical;
      min-height: 100px;
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
    .btn-view {
      background-color: #3498db;
      padding: 4px 8px;
      font-size: 12px;
    }
    .btn-delete {
      background-color: #e74c3c;
      padding: 4px 8px;
      font-size: 12px;
    }
    .btn-delete:hover {
      background-color: #c0392b;
    }
    .btn-create {
      background-color: #2ecc71;
    }
    .btn-create:hover {
      background-color: #27ae60;
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
    .article-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      background-color: #fafafa;
    }
    .review {
      border-left: 3px solid #3498db;
      padding: 10px;
      margin: 10px 0;
      background-color: #f8f9fa;
    }
    .rating {
      color: #f39c12;
      font-weight: bold;
    }
    .back-link {
      display: inline-block;
      margin-top: 20px;
      text-decoration: none;
      color: #3498db;
    }
    .icon-group {
      display: flex;
      gap: 8px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
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
      <form action="/create/page" method="GET" class="control-group">
        <button type="submit" class="btn-create">+ Создать статью</button>
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

function renderArticlesTableWithActions(articlesData) {
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
          <th>Рейтинг</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>`;

  articlesData.forEach((article, index) => {
    const formattedDate = article.publishDate ? article.publishDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : 'Дата не указана';
    
    const avgRating = calculateAverageRating(article);
    const ratingDisplay = avgRating > 0 ? `⭐ ${avgRating.toFixed(1)}` : 'Нет оценок';
    const reviewsCount = article.reviews ? article.reviews.length : 0;
    
    tableHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${article.title}</td>
          <td>${article.authors.join(', ')}</td>
          <td>${formattedDate}</td>
          <td>${ratingDisplay} (${reviewsCount} отз.)</td>
          <td class="icon-group">
            <form action="/article/${article._id}" method="GET" style="display: inline;">
              <button type="submit" class="btn-view" title="Просмотр статьи">📖 Просмотр</button>
            </form>
            <form action="/article/${article._id}/delete" method="POST" style="display: inline;" onsubmit="return confirm('Вы уверены, что хотите удалить эту статью?');">
              <button type="submit" class="btn-delete" title="Удалить статью">🗑 Удалить</button>
            </form>
          </td>
        </tr>`;
  });

  tableHtml += '</tbody></table>';
  return tableHtml;
}

function renderFullArticlePage(article) {
  if (!article) {
    return '<div class="no-data">Статья не найдена.</div>';
  }

  const formattedDate = article.publishDate ? article.publishDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) : 'Дата не указана';

  const avgRating = calculateAverageRating(article);
  
  let reviewsHtml = '';
  if (article.reviews && article.reviews.length > 0) {
    reviewsHtml = '<h3>Рецензии:</h3>';
    article.reviews.forEach((review, idx) => {
      const reviewDate = review.date ? review.date.toLocaleDateString('ru-RU') : 'Дата не указана';
      reviewsHtml += `
        <div class="review">
          <strong>${review.username}</strong> 
          <span class="rating">⭐ ${review.rating}/10</span>
          <small>(${reviewDate})</small>
          <p>${review.text}</p>
        </div>
      `;
    });
  } else {
    reviewsHtml = '<p><em>Нет рецензий на эту статью.</em></p>';
  }

  const content = `
    <div class="article-card">
      <h2>${article.title}</h2>
      <p><strong>Авторы:</strong> ${article.authors.join(', ')}</p>
      <p><strong>Дата публикации:</strong> ${formattedDate}</p>
      <p><strong>Средний рейтинг:</strong> <span class="rating">${avgRating > 0 ? '⭐ ' + avgRating.toFixed(1) + '/10' : 'Нет оценок'}</span></p>
      <p><strong>Теги:</strong> ${article.tags ? article.tags.join(', ') : 'Нет тегов'}</p>
      <h3>Содержание:</h3>
      <p>${article.content}</p>
      ${reviewsHtml}
      <a href="/" class="back-link">← Вернуться к списку статей</a>
    </div>
  `;

  return renderPage(content);
}

function renderCreateArticleForm() {
  const content = `
    <h2>Создание новой статьи</h2>
    <form action="/create" method="POST">
      <div class="form-group">
        <label>Название статьи *</label>
        <input type="text" name="title" required style="width: 100%;">
      </div>
      <div class="form-group">
        <label>Авторы (через запятую) *</label>
        <input type="text" name="authors" required style="width: 100%;" placeholder="Иванов И.И., Петров П.П.">
      </div>
      <div class="form-group">
        <label>Дата публикации *</label>
        <input type="date" name="publishDate" required>
      </div>
      <div class="form-group">
        <label>Содержание статьи *</label>
        <textarea name="content" required style="width: 100%;"></textarea>
      </div>
      <div class="form-group">
        <label>Теги (через запятую)</label>
        <input type="text" name="tags" style="width: 100%;" placeholder="наука, технология, исследования">
      </div>
      <button type="submit">Опубликовать статью</button>
      <a href="/" class="back-link" style="margin-left: 20px;">Отмена</a>
    </form>
  `;
  return renderPage(content);
}

app.get('/', async (request, response) => {
  try {
    const allArticles = await articlesCollection.find().sort({ publishDate: -1 }).toArray();
    const authors = await articlesCollection.distinct('authors');
    const allAuthorsSorted = authors.flat().filter((value, index, self) => self.indexOf(value) === index).sort();
    
    const tableContent = renderArticlesTableWithActions(allArticles);
    const pageHtml = renderPage(tableContent, allAuthorsSorted);
    response.send(pageHtml);
  } catch (error) {
    console.error('Ошибка при получении списка статей:', error);
    response.status(500).send('Внутренняя ошибка сервера.');
  }
});

app.get('/create/page', async (request, response) => {
  const pageHtml = renderCreateArticleForm();
  response.send(pageHtml);
});

app.post('/create', async (request, response) => {
  try {
    const { title, authors, publishDate, content, tags } = request.body;
    
    const authorsArray = authors.split(',').map(a => a.trim());
    const tagsArray = tags ? tags.split(',').map(t => t.trim()) : [];
    
    const newArticle = {
      title,
      authors: authorsArray,
      publishDate: new Date(publishDate),
      content,
      tags: tagsArray,
      reviews: []
    };
    
    const result = await articlesCollection.insertOne(newArticle);
    console.log(`Статья "${title}" успешно создана с ID: ${result.insertedId}`);
    response.redirect('/');
  } catch (error) {
    console.error('Ошибка при создании статьи:', error);
    response.status(500).send('Ошибка при создании статьи.');
  }
});

app.get('/article/:id', async (request, response) => {
  try {
    const id = request.params.id;
    const article = await articlesCollection.findOne({ _id: new ObjectId(id) });
    
    if (!article) {
      return response.status(404).send('<div class="container"><h1>Статья не найдена</h1><a href="/">Вернуться</a></div>');
    }
    
    const pageHtml = renderFullArticlePage(article);
    response.send(pageHtml);
  } catch (error) {
    console.error('Ошибка при получении статьи:', error);
    response.status(500).send('Внутренняя ошибка сервера.');
  }
});

app.post('/article/:id/delete', async (request, response) => {
  try {
    const id = request.params.id;
    const result = await articlesCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 1) {
      console.log(`Статья с ID ${id} успешно удалена.`);
    } else {
      console.log(`Статья с ID ${id} не найдена.`);
    }
    
    response.redirect('/');
  } catch (error) {
    console.error('Ошибка при удалении статьи:', error);
    response.status(500).send('Ошибка при удалении статьи.');
  }
});

app.post('/search/title', async (request, response) => {
  try {
    const searchText = request.body.titleQuery.trim();
    const authors = await articlesCollection.distinct('authors');
    const allAuthorsSorted = authors.flat().filter((value, index, self) => self.indexOf(value) === index).sort();

    if (!searchText) {
      const pageHtml = renderPage('<div class="no-data">Введите текст для поиска.</div>', allAuthorsSorted);
      return response.send(pageHtml);
    }

    const searchResults = await articlesCollection.find({
      title: { $regex: searchText, $options: 'i' }
    }).sort({ publishDate: -1 }).toArray();

    const tableContent = renderArticlesTableWithActions(searchResults);
    const pageHtml = renderPage(tableContent, allAuthorsSorted);
    response.send(pageHtml);
  } catch (error) {
    console.error('Ошибка при поиске по названию:', error);
    response.status(500).send('Внутренняя ошибка сервера.');
  }
});

app.post('/search/author', async (request, response) => {
  try {
    const selectedAuthor = request.body.authorQuery.trim();
    const authors = await articlesCollection.distinct('authors');
    const allAuthorsSorted = authors.flat().filter((value, index, self) => self.indexOf(value) === index).sort();

    if (!selectedAuthor) {
      const pageHtml = renderPage('<div class="no-data">Пожалуйста, выберите автора из списка.</div>', allAuthorsSorted);
      return response.send(pageHtml);
    }

    const authorArticles = await articlesCollection.find({
      authors: selectedAuthor
    }).sort({ publishDate: -1 }).toArray();

    const tableContent = renderArticlesTableWithActions(authorArticles);
    const pageHtml = renderPage(tableContent, allAuthorsSorted, selectedAuthor);
    response.send(pageHtml);
  } catch (error) {
    console.error('Ошибка при поиске по автору:', error);
    response.status(500).send('Внутренняя ошибка сервера.');
  }
});

app.listen(PORT, async () => {
  await connectToDatabase();
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
