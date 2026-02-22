// Модуль статистики игроков
import { fetchWithErrorHandling, showErrorToast } from './utils.js';

/**
 * Класс для управления статистикой онлайн игроков
 */
export class StatsModule {
    constructor(apiEndpoint = '/api/server/stats') {
        this.apiEndpoint = apiEndpoint;
        this.updateInterval = null;
        this.lastKnownCount = null;
        this.isUpdating = false;
    }
    
    /**
     * Получает количество игроков онлайн
     * @returns {Promise<number>} - Количество игроков
     */
    async getOnlinePlayersCount() {
        try {
            // Попытка получить данные из API
            const data = await fetchWithErrorHandling(this.apiEndpoint);
            
            if (data && typeof data.onlinePlayers === 'number') {
                this.lastKnownCount = data.onlinePlayers;
                return data.onlinePlayers;
            }
            
            // Если данные некорректны, возвращаем последнее известное значение или 0
            return this.lastKnownCount !== null ? this.lastKnownCount : 0;
            
        } catch (error) {
            console.error('Ошибка при получении статистики игроков:', error);
            
            // Возвращаем последнее известное значение или null
            return this.lastKnownCount;
        }
    }
    
    /**
     * Запускает автоматическое обновление статистики
     * @param {number} interval - Интервал обновления в миллисекундах (по умолчанию 60000 = 60 секунд)
     */
    startAutoUpdate(interval = 60000) {
        // Останавливаем предыдущий интервал, если он был
        this.stopAutoUpdate();
        
        console.log(`Запуск автоматического обновления статистики каждые ${interval / 1000} секунд`);
        
        // Первое обновление сразу
        this.updateStats();
        
        // Запускаем периодическое обновление
        this.updateInterval = setInterval(() => {
            this.updateStats();
        }, interval);
    }
    
    /**
     * Останавливает автоматическое обновление
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            console.log('Автоматическое обновление статистики остановлено');
        }
    }
    
    /**
     * Обновляет статистику (внутренний метод)
     */
    async updateStats() {
        if (this.isUpdating) {
            return; // Предотвращаем одновременные обновления
        }
        
        this.isUpdating = true;
        
        try {
            const count = await this.getOnlinePlayersCount();
            
            if (count !== null) {
                this.displayStats(count);
            } else {
                this.displayStatsUnavailable();
            }
        } catch (error) {
            console.error('Ошибка при обновлении статистики:', error);
            this.displayStatsUnavailable();
        } finally {
            this.isUpdating = false;
        }
    }
    
    /**
     * Отображает статистику на странице
     * @param {number} count - Количество игроков
     */
    displayStats(count) {
        const statsElement = document.getElementById('player-stats');
        
        if (!statsElement) {
            return;
        }
        
        // Проверяем, что count является числом
        if (typeof count !== 'number' || isNaN(count)) {
            console.warn('Некорректное значение статистики:', count);
            this.displayStatsUnavailable();
            return;
        }
        
        // Обновляем отображение
        statsElement.textContent = count.toString();
        statsElement.classList.remove('error', 'unavailable');
        statsElement.classList.add('active');
        
        // Добавляем анимацию при изменении значения
        if (this.lastKnownCount !== null && this.lastKnownCount !== count) {
            statsElement.classList.add('updated');
            setTimeout(() => {
                statsElement.classList.remove('updated');
            }, 500);
        }
        
        // Обновляем timestamp последнего обновления
        this.updateTimestamp();
    }
    
    /**
     * Отображает сообщение о недоступности статистики
     */
    displayStatsUnavailable() {
        const statsElement = document.getElementById('player-stats');
        
        if (!statsElement) {
            return;
        }
        
        // Если есть последнее известное значение, показываем его с пометкой
        if (this.lastKnownCount !== null) {
            statsElement.textContent = `${this.lastKnownCount} (устаревшие данные)`;
            statsElement.classList.add('unavailable');
        } else {
            statsElement.textContent = 'Недоступно';
            statsElement.classList.add('error');
        }
        
        statsElement.classList.remove('active');
    }
    
    /**
     * Обновляет timestamp последнего обновления
     */
    updateTimestamp() {
        const timestampElement = document.getElementById('stats-timestamp');
        
        if (timestampElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            timestampElement.textContent = `Обновлено: ${timeString}`;
        }
    }
    
    /**
     * Устанавливает mock API endpoint для тестирования
     * @param {string} endpoint - URL endpoint
     */
    setApiEndpoint(endpoint) {
        this.apiEndpoint = endpoint;
    }
}

// Создание экземпляра модуля
const statsModule = new StatsModule();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const statsElement = document.getElementById('player-stats');
    
    // Запускаем автоматическое обновление только если элемент статистики присутствует на странице
    if (statsElement) {
        console.log('Инициализация модуля статистики');
        
        // Запускаем автоматическое обновление каждые 60 секунд
        statsModule.startAutoUpdate(60000);
        
        // Останавливаем обновление при уходе со страницы
        window.addEventListener('beforeunload', () => {
            statsModule.stopAutoUpdate();
        });
    }
});

// Экспорт для использования в других модулях
export { statsModule };
