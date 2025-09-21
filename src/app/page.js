// src/app/page.js

'use client'; // <-- Эта строка важна! Она говорит Next.js, что это компонент для браузера.

import { useState } from 'react';
import ical from 'ical-generator';

export default function HomePage() {
  // --- Состояния для хранения данных ---
  // Файл, который выбрал пользователь
  const [file, setFile] = useState(null);
  // Данные, которые вернул Claude
  const [eventData, setEventData] = useState(null);
  // Статус загрузки, чтобы показывать "Обработка..."
  const [isLoading, setIsLoading] = useState(false);
  // Сообщение об ошибке
  const [error, setError] = useState('');

  // --- Функция отправки формы ---
  const handleSubmit = async (e) => {
    e.preventDefault(); // Предотвращаем перезагрузку страницы
    if (!file) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    // Сбрасываем состояния перед новым запросом
    setIsLoading(true);
    setError('');
    setEventData(null);

    // Используем FormData для отправки файла
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Отправляем запрос на наш API, который мы создали ранее
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Если сервер вернул ошибку, показываем её
        throw new Error(result.error || 'Произошла неизвестная ошибка');
      }

      // Сохраняем результат от Claude в состояние
      setEventData(result.events);

    } catch (err) {
      // Ловим и показываем ошибку
      setError(err.message);
    } finally {
      // В любом случае убираем индикатор загрузки
      setIsLoading(false);
    }
  };
  
  // --- Функция генерации ICS файла ---
  const handleGenerateIcs = () => {
    if (!eventData || eventData.length === 0) return;

    const cal = ical({ name: 'Мои события' });

    // Добавляем каждое событие в календарь
    eventData.forEach(event => {
      // Пытаемся правильно собрать дату и время
      const startTime = new Date(`${event.date}T${event.time || '00:00:00'}`);
      
      cal.createEvent({
        start: startTime,
        summary: event.title,
        description: event.description,
        location: event.location,
      });
    });
    
    // Генерируем ссылку для скачивания файла
    const blob = new Blob([cal.toString()], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'events.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // --- Функция для редактирования данных в форме ---
  const handleEventChange = (index, field, value) => {
    const updatedEvents = [...eventData];
    updatedEvents[index][field] = value;
    setEventData(updatedEvents);
  };

  // --- Отображение страницы ---
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '50px auto' }}>
      <h1>Анализатор афиш мероприятий</h1>
      <p>Загрузите постер, и AI извлечет данные о событии.</p>

      {/* Форма для загрузки файла */}
      <form onSubmit={handleSubmit}>
        <input 
          type="file" 
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])} 
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Обработка...' : 'Распознать'}
        </button>
      </form>

      {/* Показываем ошибку, если она есть */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Показываем результаты после обработки */}
      {eventData && (
        <div style={{ marginTop: '30px' }}>
          <h2>Результаты распознавания</h2>
          <p>Вы можете отредактировать данные перед сохранением.</p>
          
          {eventData.map((event, index) => (
            <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
              <label>Название: <input type="text" value={event.title} onChange={e => handleEventChange(index, 'title', e.target.value)} style={{ width: '95%' }}/></label><br/>
              <label>Дата (ГГГГ-ММ-ДД): <input type="text" value={event.date} onChange={e => handleEventChange(index, 'date', e.target.value)} /></label><br/>
              <label>Время (ЧЧ:ММ): <input type="text" value={event.time} onChange={e => handleEventChange(index, 'time', e.target.value)} /></label><br/>
              <label>Место: <input type="text" value={event.location} onChange={e => handleEventChange(index, 'location', e.target.value)} style={{ width: '95%' }}/></label><br/>
              <label>Описание: <textarea value={event.description} onChange={e => handleEventChange(index, 'description', e.target.value)} style={{ width: '95%', minHeight: '60px' }}></textarea></label><br/>
            </div>
          ))}
          
          <button onClick={handleGenerateIcs}>
            Сгенерировать .ics файл
          </button>
        </div>
      )}
    </main>
  );
}
