// Модуль загрузки мод-клиента
import firebaseConfig from '../config/firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showErrorToast, showInfoToast, fetchWithErrorHandling } from './utils.js';

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Класс для управления загрузкой мод-клиента
 */
export class DownloadModule {
    constructor() {
        this.db = db;
        this.clientInfo = null;
    }
    
    /**
     * Инициирует загрузку мод-клиента
     * @returns {Promise<void>}
     */
    async downloadClient() {
        try {
            // Получаем информацию о клиенте
            const info = await this.getClientInfo();
            
            if (!info.isAvailable) {
                showInfoToast('Файл клиента временно недоступен. Попробуйте позже');
                return;
            }
            
            // Проверяем доступность файла
            const isAvailable = await this.checkAvailability();
            if (!isAvailable) {
                showInfoToast('Файл клиента временно недоступен. Попробуйте позже');
                return;
            }
            
            // Инициируем загрузку
            console.log('Начало загрузки клиента:', info.downloadUrl);
            
            // Открываем ссылку для загрузки в новом окне
            window.open(info.downloadUrl, '_blank');
            
            // Логируем загрузку (опционально)
            this.logDownload(info.version);
            
        } catch (error) {
            console.error('Ошибка при загрузке клиента:', error);
            showErrorToast('Не удалось начать загрузку. Попробуйте позже');
        }
    }
    
    /**
     * Получает информацию о доступной версии
     * @returns {Promise<Object>} - {version: string, size: string, url: string, isAvailable: boolean}
     */
    async getClientInfo() {
        try {
            // Если информация уже загружена, возвращаем её
            if (this.clientInfo) {
                return this.clientInfo;
            }
            
            // Получаем информацию из Firestore
            const docRef = doc(this.db, 'clientVersions', 'latest');
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.clientInfo = {
                    version: data.version || 'Неизвестно',
                    size: data.fileSize || 'Неизвестно',
                    downloadUrl: data.downloadUrl || '#',
                    isAvailable: data.isAvailable !== false,
                    releaseDate: data.releaseDate
                };
            } else {
                // Fallback данные, если документ не найден
                console.warn('Документ clientVersions/latest не найден, используем fallback данные');
                this.clientInfo = {
                    version: '1.8.9-v2.0',
                    size: '45.2 MB',
                    downloadUrl: '#',
                    isAvailable: false
                };
            }
            
            return this.clientInfo;
            
        } catch (error) {
            console.error('Ошибка при получении информации о клиенте:', error);
            
            // Возвращаем fallback данные в случае ошибки
            return {
                version: '1.8.9-v2.0',
                size: '45.2 MB',
                downloadUrl: '#',
                isAvailable: false
            };
        }
    }
    
    /**
     * Проверяет доступность файла
     * @returns {Promise<boolean>} - true если файл доступен
     */
    async checkAvailability() {
        try {
            const info = await this.getClientInfo();
            
            // Если URL не установлен или это placeholder
            if (!info.downloadUrl || info.downloadUrl === '#') {
                return false;
            }
            
            // Если в данных явно указано, что недоступен
            if (info.isAvailable === false) {
                return false;
            }
            
            // Проверяем доступность URL (HEAD запрос)
            try {
                const response = await fetch(info.downloadUrl, { 
                    method: 'HEAD',
                    mode: 'no-cors' // Для избежания CORS проблем
                });
                
                // Если no-cors, мы не можем проверить статус, считаем доступным
                return true;
            } catch (fetchError) {
                console.warn('Не удалось проверить доступность файла:', fetchError);
                // Если проверка не удалась, но URL есть, считаем доступным
                return true;
            }
            
        } catch (error) {
            console.error('Ошибка при проверке доступности:', error);
            return false;
        }
    }
    
    /**
     * Логирует загрузку (опционально)
     * @param {string} version - Версия клиента
     */
    logDownload(version) {
        try {
            // Можно добавить аналитику или логирование в Firestore
            console.log('Загрузка клиента версии:', version);
            
            // Сохраняем в localStorage для статистики
            const downloads = JSON.parse(localStorage.getItem('downloads') || '[]');
            downloads.push({
                version: version,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('downloads', JSON.stringify(downloads));
            
        } catch (error) {
            console.error('Ошибка при логировании загрузки:', error);
        }
    }
    
    /**
     * Отображает информацию о клиенте на странице
     */
    async displayClientInfo() {
        try {
            const info = await this.getClientInfo();
            
            // Обновляем элементы на странице
            const versionElement = document.getElementById('client-version');
            const sizeElement = document.getElementById('client-size');
            const downloadBtn = document.getElementById('download-btn');
            
            if (versionElement) {
                versionElement.textContent = info.version;
            }
            
            if (sizeElement) {
                sizeElement.textContent = info.size;
            }
            
            if (downloadBtn) {
                if (!info.isAvailable) {
                    downloadBtn.disabled = true;
                    downloadBtn.textContent = 'Временно недоступно';
                    downloadBtn.classList.add('disabled');
                } else {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = 'Скачать';
                    downloadBtn.classList.remove('disabled');
                }
            }
            
        } catch (error) {
            console.error('Ошибка при отображении информации о клиенте:', error);
        }
    }
}

// Создание экземпляра модуля
const downloadModule = new DownloadModule();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Отображаем информацию о клиенте
    await downloadModule.displayClientInfo();
    
    // Добавляем обработчик на кнопку загрузки
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            await downloadModule.downloadClient();
        });
    }
});

// Экспорт для использования в других модулях
export { downloadModule };
