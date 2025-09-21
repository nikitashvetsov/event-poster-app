// src/app/api/process/route.js

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createWorker } from 'tesseract.js';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Начинаю инициализацию Tesseract worker...');
    
    // Указываем Tesseract пути к файлам внутри серверной функции Vercel
    // Vercel размещает публичные файлы в корне
    const workerPath = '/worker.min.js';
    const corePath = '/tesseract-core.wasm';
    
    const worker = await createWorker('rus', 1, {
        workerPath: workerPath,
        corePath: corePath,
        // Путь к языковым данным
        tessdata: '/tessdata/',
        // Эти параметры могут помочь ускорить работу на сервере
        cacheMethod: 'none',
        workerBlobURL: false,
    });

    console.log('Начинаю распознавание текста...');
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();
    console.log('Распознанный текст:', text);

    if (!text) {
        return NextResponse.json({ error: 'Не удалось распознать текст на изображении.' }, { status: 500 });
    }

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
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const extractedJson = JSON.parse(msg.content[0].text);
    console.log('Получен ответ от Claude:', extractedJson);
    
    return NextResponse.json(extractedJson);

  } catch (error) {
    console.error('Произошла ошибка:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
