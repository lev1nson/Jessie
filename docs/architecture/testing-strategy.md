# **Раздел 14: Стратегия тестирования**

## **Пирамида тестирования (Testing Pyramid)**

```
      /|\  
     / | \    <-- E2E Тесты (Playwright) - мало  
    /--|--\  
   /   |   \  <-- Интеграционные тесты (Vitest) - среднее  
  /----|----\  
 /     |     \<-- Unit Тесты (Vitest) - много  
/______|______\
```

## **Организация тестов (Test Organization)**

* **Frontend-тесты**: Находятся рядом с компонентами (Component.test.tsx), используют **Vitest** и **React Testing Library**.  
* **Backend-тесты**: Находятся в папке __tests__ рядом с API-маршрутами, используют **Vitest**.  
* **E2E-тесты**: Находятся в отдельной папке e2e в корне проекта, используют **Playwright**.

## **Примеры тестов (Test Examples)**

* **Пример Frontend Unit-теста**:  
```typescript
it('should render the button with correct text', () => {  
  render(<Button>Click me</Button>);  
  expect(screen.getByText('Click me')).toBeInTheDocument();  
});
```

* **Пример Backend-теста**:  
```typescript
it('should return 401 if user is not authenticated', async () => {  
  vi.spyOn(ChatRepository, 'getChatsByUserId').mockResolvedValue([]);  
  const response = await GET(mockRequest);  
  expect(response.status).toBe(401);  
});
```

* **Пример E2E-теста**:  
```typescript
test('should allow a user to log in', async ({ page }) => {  
  await page.goto('/');  
  await page.click('button:text("Войти через Google")');  
  await expect(page.locator('h1')).toHaveText('Welcome, user!');  
});
``` 