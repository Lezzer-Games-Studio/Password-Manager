import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";




// Функція перевірки
// В app.js
async function startReminderCheck(userId, db) {
    setInterval(async () => {
        const now = Date.now();
        const windowStart = now - 60000;
        const windowEnd = now + 60000;

        const q = query(
            collection(db, "notes"),
            where("userId", "==", userId),
            where("reminder", ">=", windowStart), // Перевірте назву поля!
            where("reminder", "<=", windowEnd)
        );

        const snap = await getDocs(q);
        snap.forEach(doc => {
            // Щоб не було повторів, можна перевіряти чи вже показували
            new Notification("VaultSafe", { body: doc.data().text });
        });
    }, 60000);
}

// У вашому onAuthStateChanged додайте виклик:
onAuthStateChanged(auth, (user) => {
    if (user) {
        // ... ваш існуючий код ...
        startReminderCheck(user.uid, db);
    }
});

// Глобальний об'єкт для зберігання поточного користувача
let currentUser = null;

// Централізована навігація додатку
window.navigation = {
    // 1. ПРОФІЛЬ
    showProfile: async (user) => {
        currentUser = user || currentUser;
        try {
            const { renderProfile } = await import('./pages/profile.js');
            renderProfile(currentUser, auth, db, 
                () => window.navigation.showVault(),
                () => window.navigation.showSettings(),
                () => window.navigation.showSubscribe(),
                () => window.navigation.showNotes() // Перехід на нотатки
            );
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },
    
    // 2. СЕЙФ (ПАРОЛІ)
    showVault: async (user) => {
        const targetUser = user || currentUser;
        if (!targetUser) return;
        try {
            const { renderVault } = await import('./pages/vault.js');
            renderVault(targetUser, auth, db,
                () => window.navigation.showProfile(),
                () => window.navigation.showSettings(),
                () => window.navigation.showNotes() // Додано в меню сейфу
            );
        } catch (error) {
            console.error('Error loading vault:', error);
        }
    },

    // 3. НОТАТКИ ТА ЗАВДАННЯ (НОВИЙ РОЗДІЛ)
    showNotes: async (user) => {
        const targetUser = user || currentUser;
        if (!targetUser) return;
        try {
            const { renderNotes } = await import('./pages/notes.js');
            renderNotes(targetUser, auth, db,
                () => window.navigation.showProfile(),
                () => window.navigation.showVault(),
                () => window.navigation.showSettings(),
                () => window.navigation.showSubscribe()
            );
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    },
    
    // 4. НАЛАШТУВАННЯ
    showSettings: async (user) => {
        const targetUser = user || currentUser;
        if (!targetUser) return;
        try {
            const { renderSettings } = await import('./pages/settings.js');
            renderSettings(targetUser, auth, db,
                () => window.navigation.showProfile(),
                () => window.navigation.showVault(),
                () => window.navigation.showSubscribe(),
                () => window.navigation.showNotes() // Додано
            );
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    },
    
    // 5. ПІДПИСКА (PRO)
    showSubscribe: async (user) => {
        const targetUser = user || currentUser;
        if (!targetUser) return;
        try {
            const { renderSubscribe } = await import('./pages/subscribe.js');
            renderSubscribe(targetUser, auth, db,
                () => window.navigation.showProfile(), // onBack
                () => window.navigation.showProfile(), // onToProfile
                () => window.navigation.showVault(),   // onToVault
                () => window.navigation.showSettings(), // onToSettings
                () => window.navigation.showNotes()    // onToNotes
            );
        } catch (error) {
            console.error('Error loading subscribe:', error);
        }
    },
    
    
    // 6. АВТОРИЗАЦІЯ ТА РЕЄСТРАЦІЯ
   showLogin: async () => {
        try {
            const { renderLogin } = await import('./pages/login.js');
            renderLogin(auth, 
                () => window.navigation.showRegister()
            );
        } catch (error) {
            console.error('Error loading login:', error);
        }
    },
    
    showRegister: async () => {
        try {
            const { renderRegister } = await import('./pages/register.js');
            renderRegister(auth, db,
                () => window.navigation.showLogin()
            );
        } catch (error) {
            console.error('Error loading register:', error);
        }
    }
};

// Слідкуємо за станом входу користувача
onAuthStateChanged(auth, (user) => {
    const root = document.getElementById('root');
    
    if (user) {
        currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Показуємо лоадер перед завантаженням інтерфейсу
        root.innerHTML = `
            <div class="loader-container">
                <div class="loader-visual">
                    <div class="spinner"></div>
                    <div class="spinner-inner"></div>
                    <div class="loader-logo">🛡️</div>
                </div>
                <div class="loader-text">Вхід до VaultSafe...</div>
            </div>
        `;
        
        setTimeout(() => {
            window.navigation.showProfile(currentUser);
        }, 300);
        
    } else {
        currentUser = null;
        localStorage.removeItem('currentUser');
        window.navigation.showLogin();
    }
});

// Додаємо стилі для спіннера завантаження
const style = document.createElement('style');
style.textContent = `
    .loader-container {
        display: flex; flex-direction: column; justify-content: center; 
        align-items: center; height: 100vh; color: #94a3b8; font-family: sans-serif;
    }
    .spinner {
        width: 40px; height: 40px; border: 3px solid rgba(59, 130, 246, 0.1);
        border-top-color: #3b82f6; border-radius: 50%;
        animation: spin 0.8s linear infinite; margin-bottom: 15px;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// --- Electron API: Оновлення програми ---
if (window.electronAPI) {
    window.electronAPI.onUpdateAvailable((version) => {
        // Замість alert можна зробити гарну плашку внизу екрана
        console.log(`Доступне оновлення: ${version}`);
    });

    window.electronAPI.onUpdateDownloaded(() => {
        const confirmUpdate = confirm("Нова версія готова до встановлення. Перезавантажити зараз?");
        if (confirmUpdate) {
            window.electronAPI.restartApp();
        }
    });
}

// Функція для перевірки нагадувань
