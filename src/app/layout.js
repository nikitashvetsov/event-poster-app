// src/app/layout.js

// Этот объект задает метаданные страницы, например, заголовок в вкладке браузера
export const metadata = {
  title: "Анализатор афиш",
  description: "Загрузите постер мероприятия и получите данные для календаря",
};

// Это и есть наш главный шаблон (Root Layout)
export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        {/* {children} — это то место, куда Next.js будет вставлять содержимое вашей страницы page.js */}
        {children}
      </body>
    </html>
  );
}
