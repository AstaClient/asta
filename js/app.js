// Главный модуль приложения
import { auth, db } from '../config/firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

/**
 * Класс NavigationBar
 * Управляет отображением навигационного меню в зависимости от состояния аутентификации
 */
class NavigationBar {
    constructor() {
        this.navLinksElement = document.getElementById('nav-links');
        this.currentUser = null;
    }

    /**
     * Рендерит навигационное меню
     * @param {Object|null} user - Текущий пользователь (null если не аутентифицирован)
     */
    render(user) {
        if (!this.navLinksElement) return;
        
        this.currentUser = user;
        
        if (user) {
            // Пользователь аутентифицирован
            this.navLinksElement.innerHTML = `
                <a href="index.html">Главная</a>
                <a href="dashboard.html">Личный кабинет</a>
                <span class="username-display">${user.displayName || user.username || user.email}</span>
                <button class="btn btn-secondary logout-btn" id="logout-btn">Выход</button>
            `;
            
            // Добавить обработчик для кнопки выхода
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', handleLogout);
            }
        } else {
            // Пользователь не аутентифицирован
            this.navLinksElement.innerHTML = `
                <a href="index.html">Главная</a>
                <a href="login.html" class="login-btn">Вход</a>
                <a href="register.html" class="register-btn">Регистрация</a>
            `;
        }
    }

    /**
     * Обновляет меню в зависимости от состояния аутентификации
     * @param {boolean} isAuthenticated - Статус аутентификации
     */
    updateAuthState(isAuthenticated) {
        if (isAuthenticated && this.currentUser) {
            this.render(this.currentUser);
        } else if (!isAuthenticated) {
            this.render(null);
        }
    }
}

// Создаем глобальный экземпляр NavigationBar
const navigationBar = new NavigationBar();

/**
 * Главный класс приложения
 * Управляет инициализацией и интеграцией всех модулей
 */
class App {
    constructor() {
        this.currentUser = null;
        this.navigationBar = navigationBar;
        this.init();
    }

    /**
     * Инициализация приложения
     */
    async init() {
        console.log('Приложение инициализировано');
        
        // Проверка состояния аутентификации
        this.checkAuthState();
        
        // Инициализация модулей в зависимости от страницы
        const currentPage = this.getCurrentPage();
        
        if (currentPage === 'index.html' || currentPage === '') {
            await this.initHomePage();
        }
    }

    /**
     * Получение текущей страницы
     * @returns {string} - Имя текущей страницы
     */
    getCurrentPage() {
        return window.location.pathname.split('/').pop();
    }

    /**
     * Проверка состояния аутентификации
     */
    checkAuthState() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.navigationBar.render(user);
            
            // Защита страницы dashboard (дополнительная проверка)
            const currentPage = this.getCurrentPage();
            if (currentPage === 'dashboard.html' && !user) {
                console.log('Неавторизованный доступ к dashboard, перенаправление на login');
                window.location.href = 'login.html';
            }
        });
    }

    /**
     * Инициализация главной страницы
     */
    async initHomePage() {
        console.log('Главная страница инициализирована');
        
        // Модули загрузки и статистики инициализируются автоматически
        // через их собственные DOMContentLoaded обработчики в download.js и stats.js
        
        // Запускаем автоматическое обновление статистики, если модуль доступен
        if (window.statsModule) {
            window.statsModule.startAutoUpdate(60000);
        }
    }
}

// Обработчик выхода
async function handleLogout() {
    try {
        await auth.signOut();
        console.log('Пользователь вышел из системы');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
        // Показываем ошибку пользователю
        if (window.showErrorToast) {
            window.showErrorToast('Не удалось выйти из аккаунта');
        }
    }
}

// Утилита для отображения toast уведомлений
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

export { NavigationBar, navigationBar, App };

