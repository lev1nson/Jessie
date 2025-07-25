# **Раздел 2: Требования**

## **Функциональные требования (FR)**

* **FR1: Безопасная аутентификация**: Система ДОЛЖНА позволять пользователю безопасно подключать свой Google-аккаунт, используя протокол OAuth 2.0.  
* **FR2: Сбор писем**: Система ДОЛЖНА иметь доступ и обрабатывать как входящие, так и исходящие письма из подключенного аккаунта Gmail.  
* **FR3: Обработка вложений**: Система ДОЛЖНА извлекать и индексировать текстовое содержимое из распространенных типов вложений, включая .pdf и .docx.  
* **FR4: Автоматическая фильтрация**: Система ДОЛЖНА автоматически определять и исключать из индексации письма от известных маркетинговых и автоматических рассылок.  
* **FR5: Запросы на естественном языке**: Система ДОЛЖНА предоставлять чат-интерфейс, где пользователь может задавать вопросы на естественном языке.  
* **FR6: Извлечение фактов**: Система ДОЛЖНА отвечать на фактические вопросы, извлекая релевантную информацию из писем и вложений.  
* **FR7: Идентификация участников**: Система ДОЛЖНА уметь определять и выводить список всех уникальных участников переписки по заданной теме.  
* **FR8: Анализ за период**: Система ДОЛЖНА уметь обобщать информацию за определенный период времени для ответа на комплексные вопросы.  
* **FR9 (После MVP)**: **Анализ тональности**: Система ДОЛЖНА уметь анализировать тональность писем конкретного человека с течением времени.

## **Нефункциональные требования (NFR)**

* **NFR1: Удобство использования**: Интерфейс ДОЛЖЕН быть интуитивно понятным, **работать отзывчиво, без заметных для пользователя задержек** при стандартных операциях, и соответствовать стандартной компоновке современных чат-приложений.  
* **NFR2: Безопасность**: Все данные пользователя, как при передаче, так и при хранении, ДОЛЖНЫ быть зашифрованы.  
* **NFR3: Масштабируемость**: Архитектура ДОЛЖНА быть спроектирована с расчетом на десятикратное увеличение объема данных.  
* **NFR4: Актуальность данных**: Система ДОЛЖНА периодически проверять и индексировать новые письма. 