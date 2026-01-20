import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export async function renderSubscribe(user, auth, db, onBack, onToProfile, onToVault, onToSettings) {
    const root = document.getElementById("root");
    
    // Быстрая загрузка - сначала показываем HTML, потом данные
    const initialHTML = `
        <div class="sidebar">
            <h2 style="margin-bottom: 40px;">VaultSafe</h2>
            <div class="menu-item" id="m_profile">👤 Мій Профіль</div>
            <div class="menu-item" id="m_vault">🔑 Паролі</div>
            <div class="menu-item active" id="m_subscribe">👑 Підписка</div>
            <div class="menu-item" id="m_settings">⚙️ Налаштування</div>
            <div style="margin-top: auto;">
                <div id="plan_info" style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px; font-size: 12px;">
                    План: <b id="plan_status">Завантаження...</b>
                </div>
                <button id="btn_logout" style="background:none; border:none; color:#ef4444; cursor:pointer; width:100%; text-align:left; padding:10px;">Вийти</button>
            </div>
        </div>

        <div class="main-content">
            <div style="max-width: 800px; margin: 0 auto;">
                <h1 style="text-align: center; margin-bottom: 40px;">👑 Отримайте PRO Підписку</h1>
                <div id="content_area" style="text-align: center; padding: 40px; color: var(--text-dim);">
                    Завантаження інформації про підписку...
                </div>
            </div>
        </div>
    `;
    
    root.innerHTML = initialHTML;
    
    // Устанавливаем базовую навигацию сразу
    setupBasicNavigation(user, auth, db, onBack, onToProfile, onToVault, onToSettings);
    
    // Затем загружаем данные
    setTimeout(async () => {
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            const userData = userSnap.exists() ? userSnap.data() : { plan: "free", expiresAt: 0 };
            const isPro = userData.plan === "pro" && (userData.expiresAt || 0) > Date.now();
            
            // Обновляем информацию о плане
            document.getElementById('plan_status').innerHTML = `
                <span style="color: ${isPro ? '#eab308' : '#3b82f6'}; text-transform: uppercase;">
                    ${isPro ? 'PRO' : 'FREE'}
                </span>
            `;
            
            // Обновляем контент
            document.getElementById('content_area').innerHTML = generateContent(isPro, userData);
            
            // Устанавливаем обработчики событий
            setupEventHandlers(user, auth, db, onBack, isPro, userData);
            
        } catch (e) {
            console.error("Error loading subscription data:", e);
            document.getElementById('content_area').innerHTML = `
                <div style="color: #ef4444; padding: 20px;">
                    Помилка завантаження даних. Спробуйте оновити сторінку.
                </div>
            `;
        }
        
        // Подсветка активного меню
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        const subscribeBtn = document.getElementById('m_subscribe');
        if (subscribeBtn) subscribeBtn.classList.add('active');
    }, 100);
}

// Вспомогательные функции
function setupBasicNavigation(user, auth, db, onBack, onToProfile, onToVault, onToSettings) {
    // Навигация
    document.getElementById("m_profile").onclick = () => {
        if (onToProfile) onToProfile(user);
        else if (window.navigation?.showProfile) window.navigation.showProfile(user);
    };
    
    document.getElementById("m_vault").onclick = () => {
        if (onToVault) onToVault(user);
        else if (window.navigation?.showVault) window.navigation.showVault(user);
    };
    
    document.getElementById("m_settings").onclick = () => {
        if (onToSettings) onToSettings(user);
        else if (window.navigation?.showSettings) window.navigation.showSettings(user);
    };
    
    document.getElementById("btn_logout").onclick = () => signOut(auth);
}

function generateContent(isPro, userData) {
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px;">
            <!-- Free план -->
            <div class="pricing-card" style="
                background: rgba(255,255,255,0.05);
                border-radius: 15px;
                padding: 30px;
                border: 1px solid rgba(255,255,255,0.1);
                ${!isPro ? 'border: 2px solid var(--accent);' : ''}
            ">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: ${isPro ? '#6b7280' : '#3b82f6'};">FREE</h3>
                    <div style="font-size: 48px; font-weight: bold; margin: 10px 0;">$0</div>
                    <div style="color: var(--text-dim);">назавжди</div>
                </div>
                
                <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ До 50 паролів</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ До 2 нотаток</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ Безпечне зберігання</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✗ Без резервних копій</li>
                    <li style="padding: 8px 0;">✗ Без пріоритетної підтримки</li>
                </ul>
                
                ${!isPro ? 
                    '<button style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; cursor: not-allowed;" disabled>Поточний план</button>' :
                    '<button id="btn_downgrade" style="background: #6b7280; color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; cursor: pointer;">Перейти на Free</button>'
                }
            </div>
            
            <!-- PRO план -->
            <div class="pricing-card" style="
                background: rgba(234, 179, 8, 0.1);
                border-radius: 15px;
                padding: 30px;
                border: 1px solid rgba(234, 179, 8, 0.3);
                ${isPro ? 'border: 2px solid #eab308;' : ''}
                position: relative;
            ">
                ${isPro ? 
                    '<div style="position: absolute; top: 10px; right: 10px; background: #eab308; color: black; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">АКТИВНА</div>' : 
                    '<div style="position: absolute; top: 10px; right: 10px; background: #ef4444; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">ПОПУЛЯРНА</div>'
                }
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #eab308;">PRO</h3>
                    <div style="font-size: 48px; font-weight: bold; margin: 10px 0;">$4.99</div>
                    <div style="color: var(--text-dim);">на місяць</div>
                </div>
                
                <ul style="list-style: none; padding: 0; margin-bottom: 30px;">
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ Необмежені паролі</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ Необмежені нотатки</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ Авторезервне копіювання</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ Пріоритетна підтримка</li>
                    <li style="padding: 8px 0;">✓ Додаткові теми оформлення</li>
                </ul>
                
                ${isPro ? 
                    '<button style="background: #eab308; color: black; border: none; padding: 12px; border-radius: 8px; width: 100%; cursor: not-allowed;" disabled>Активна підписка</button>' :
                    '<button id="btn_buy_pro" style="background: #eab308; color: black; border: none; padding: 12px; border-radius: 8px; width: 100%; cursor: pointer; font-weight: bold;">💳 Оформити PRO</button>'
                }
                
                ${isPro && userData.expiresAt ? 
                    `<div style="margin-top: 15px; text-align: center; font-size: 12px; color: #eab308;">
                        Активна до: ${new Date(userData.expiresAt).toLocaleDateString('uk-UA')}
                    </div>` : ''
                }
            </div>
        </div>
        
        <!-- Демо-режим для тестирования -->
        <div class="glass-card" style="margin-top: 20px; background: rgba(59, 130, 246, 0.1);">
            <h3>🎯 Тестовий режим</h3>
            <p style="color: var(--text-dim);">Для тестування функціоналу PRO підписки, натисніть кнопку "Тестовий PRO"</p>
            <button id="btn_test_pro" style="background: #10b981; color: white; border: none; padding: 12px; border-radius: 8px; width: 100%; cursor: pointer; margin-top: 10px;">
                🚀 Активувати тестовий PRO (30 днів)
            </button>
        </div>
    `;
}

function setupEventHandlers(user, auth, db, onBack, isPro, userData) {
    // Покупка PRO (тестовый режим)
    const buyProBtn = document.getElementById('btn_buy_pro');
    if (buyProBtn) {
        buyProBtn.onclick = async () => {
            if (confirm('Увімкнути тестовий PRO режим на 30 днів? (Демо-версія)')) {
                try {
                    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // +30 дней
                    
                    await updateDoc(doc(db, "users", user.uid), {
                        plan: "pro",
                        expiresAt: expiresAt,
                        subscribedAt: Date.now()
                    });
                    
                    alert('🎉 Вітаємо! Ви отримали PRO підписку на 30 днів!');
                    
                    if (onBack) onBack(user);
                    else if (window.navigation?.showProfile) window.navigation.showProfile(user);
                    
                } catch (error) {
                    console.error('Payment error:', error);
                    alert('Помилка активації PRO');
                }
            }
        };
    }
    
    // Тестовый PRO
    const testProBtn = document.getElementById('btn_test_pro');
    if (testProBtn) {
        testProBtn.onclick = async () => {
            if (confirm('Активувати тестовий PRO режим на 30 днів?')) {
                try {
                    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
                    
                    await updateDoc(doc(db, "users", user.uid), {
                        plan: "pro",
                        expiresAt: expiresAt,
                        subscribedAt: Date.now(),
                        isTrial: true
                    });
                    
                    alert('🎉 Тестовий PRO активовано на 30 днів!');
                    
                    if (onBack) onBack(user);
                    else if (window.navigation?.showProfile) window.navigation.showProfile(user);
                    
                } catch (error) {
                    console.error('Trial activation error:', error);
                    alert('Помилка активації тестового PRO');
                }
            }
        };
    }
    
    // Понижение до Free
    const downgradeBtn = document.getElementById('btn_downgrade');
    if (downgradeBtn) {
        downgradeBtn.onclick = async () => {
            if (confirm('Ви впевнені, що хочете перейти на безкоштовний план? Це скасує вашу PRO підписку.')) {
                try {
                    await updateDoc(doc(db, "users", user.uid), {
                        plan: "free",
                        expiresAt: 0
                    });
                    alert('План змінено на Free!');
                    // Обновляем страницу
                    window.location.reload();
                } catch (e) {
                    console.error(e);
                    alert('Помилка при зміні плану');
                }
            }
        };
    }
}