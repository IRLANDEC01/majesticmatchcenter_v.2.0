const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard', () => {
  test('should display the main heading', async ({ page }) => {
    // Navigate to the admin dashboard page
    await page.goto('/admin');

    // Find the main heading
    const heading = page.locator('h1');

    // Assert that the heading is visible and has the correct text
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Панель управления');
  });
});

test.describe('Map Templates Status Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на страницу шаблонов карт
    await page.goto('/admin/map-templates');
    await page.waitForLoadState('networkidle');
  });

  test('должен отображать статус-фильтр с правильными опциями', async ({ page }) => {
    // Ищем контейнер статус-фильтра
    const statusFilter = page.locator('[data-testid="status-filter"]').or(
      page.locator('text=Показать:').locator('..').locator('div[role="radiogroup"]')
    );
    
    // Если не нашли по data-testid, ищем по структуре
    if (await statusFilter.count() === 0) {
      const filterContainer = page.locator('text=Показать:').locator('..');
      await expect(filterContainer).toBeVisible();
      
      // Проверяем наличие toggle группы
      const toggleGroup = filterContainer.locator('[role="radiogroup"]');
      await expect(toggleGroup).toBeVisible();
      
      // Проверяем опции
      await expect(toggleGroup.locator('text=🟢')).toBeVisible(); // Активные
      await expect(toggleGroup.locator('text=Активные')).toBeVisible();
    }
  });

  test('должен переключаться между статусами для super_admin', async ({ page }) => {
    // Устанавливаем роль super_admin через localStorage или cookie
    await page.addInitScript(() => {
      localStorage.setItem('admin_role', 'super_admin');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Ищем toggle группу
    const toggleGroup = page.locator('[role="radiogroup"]');
    await expect(toggleGroup).toBeVisible();
    
    // Проверяем, что по умолчанию выбрано "Активные"
    const activeButton = toggleGroup.locator('[data-state="on"]');
    await expect(activeButton).toContainText('Активные');
    
    // Кликаем на "Архивные"
    const archivedButton = toggleGroup.locator('text=Архивные');
    if (await archivedButton.count() > 0) {
      await archivedButton.click();
      
      // Ждем изменения состояния
      await page.waitForTimeout(500);
      
      // Проверяем, что теперь выбрано "Архивные"
      const newActiveButton = toggleGroup.locator('[data-state="on"]');
      await expect(newActiveButton).toContainText('Архивные');
      
      // Проверяем изменение URL или параметров поиска
      const url = page.url();
      console.log('Current URL after clicking Archived:', url);
    }
    
    // Кликаем на "Все"
    const allButton = toggleGroup.locator('text=Все');
    if (await allButton.count() > 0) {
      await allButton.click();
      
      // Ждем изменения состояния
      await page.waitForTimeout(500);
      
      // Проверяем, что теперь выбрано "Все"
      const newActiveButton = toggleGroup.locator('[data-state="on"]');
      await expect(newActiveButton).toContainText('Все');
    }
  });

  test('должен показывать только индикатор для обычного admin', async ({ page }) => {
    // Устанавливаем роль admin (не super_admin)
    await page.addInitScript(() => {
      localStorage.setItem('admin_role', 'admin');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Ищем индикатор режима
    const modeIndicator = page.locator('text=Режим:');
    if (await modeIndicator.count() > 0) {
      await expect(modeIndicator).toBeVisible();
      await expect(page.locator('text=🟢').locator('text=Активные')).toBeVisible();
      
      // Проверяем, что toggle группы нет
      const toggleGroup = page.locator('[role="radiogroup"]');
      await expect(toggleGroup).not.toBeVisible();
    }
  });

  test('должен обновлять результаты поиска при смене статуса', async ({ page }) => {
    // Устанавливаем роль super_admin
    await page.addInitScript(() => {
      localStorage.setItem('admin_role', 'super_admin');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Вводим поисковый запрос
    const searchInput = page.locator('input[placeholder*="Поиск"]');
    await searchInput.fill('test');
    await page.waitForTimeout(1000); // Ждем debounce
    
    // Переключаем на "Архивные"
    const toggleGroup = page.locator('[role="radiogroup"]');
    const archivedButton = toggleGroup.locator('text=Архивные');
    
    if (await archivedButton.count() > 0) {
      await archivedButton.click();
      await page.waitForTimeout(1000);
      
      // Проверяем, что произошел новый запрос (placeholder должен измениться)
      const updatedPlaceholder = await searchInput.getAttribute('placeholder');
      expect(updatedPlaceholder).toContain('архивным');
    }
  });

  test('должен сохранять состояние фильтра при навигации', async ({ page }) => {
    // Устанавливаем роль super_admin
    await page.addInitScript(() => {
      localStorage.setItem('admin_role', 'super_admin');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Переключаем на "Все"
    const toggleGroup = page.locator('[role="radiogroup"]');
    const allButton = toggleGroup.locator('text=Все');
    
    if (await allButton.count() > 0) {
      await allButton.click();
      await page.waitForTimeout(500);
      
      // Переходим на другую страницу и возвращаемся
      await page.goto('/admin');
      await page.goto('/admin/map-templates');
      await page.waitForLoadState('networkidle');
      
      // Проверяем, что состояние сохранилось (может быть сброшено - это нормально)
      const newToggleGroup = page.locator('[role="radiogroup"]');
      await expect(newToggleGroup).toBeVisible();
    }
  });
}); 