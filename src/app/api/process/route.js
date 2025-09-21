// src/app/api/process/route.js

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createWorker } from 'tesseract.js';

// Инициализируем клиент Anthropic (Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Эта функция будет обрабатывать POST-запросы
export async function POST(request) {
  try {
    // 1. Получаем данные из запроса (это будет наше изображение)
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    // Конвертируем файл в формат, понятный для OCR
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Распознавание текста с изображения (OCR)
    console.log('Начинаю распознавание текста...');
    const worker = await createWorker('rus'); // Используем русский язык
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    console.log('Распознанный текст:', text);

    if (!text) {
        return NextResponse.json({ error: 'Не удалось распознать текст на изображении.' }, { status: 500 });
    }

    // 3. Формируем запрос для Claude
    const prompt = `
      Проанализируй следующий текст с афиши мероприятия и извлеки из него информацию в формате JSON.
      
      Вот правила, которым нужно строго следовать:
      - Результат должен быть ТОЛЬКО JSON объектом, без какого-либо дополнительного текста до или после.
      - Поле "events" должно быть массивом, даже если на афише только одно событие.
      - Для каждого события должны быть поля: title, date (в формате ГГГГ-ММ-ДД), time (в формате ЧЧ:ММ), location и description.
      - Если какая-то информация отсутствует (например, время), оставь это поле как пустую строку "".
      - Если на афише указано несколько дат для одного и того же события, создай отдельный объект в массиве "events" для каждой даты.
      - Если на афише несколько разных мероприятий, создай отдельный объект для каждого.

      Текст с афиши:
      ---
      ${text}
      ---
    `;

    console.log('Отправляю запрос в Claude...');
    // 4. Отправляем запрос в Claude API
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Используем быструю и недорогую модель
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    // Извлекаем и парсим JSON из ответа
    const extractedJson = JSON.parse(msg.content[0].text);
    console.log('Получен ответ от Claude:', extractedJson);
    
    // 5. Отправляем результат обратно на фронтенд
    return NextResponse.json(extractedJson);

  } catch (error) {
    console.error('Произошла ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
