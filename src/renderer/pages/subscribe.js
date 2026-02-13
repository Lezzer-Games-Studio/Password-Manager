import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// --- 💳 КОНФІГУРАЦІЯ ОПЛАТИ ---
const CRYPTO_WALLET = "0xYourWalletAddressHere777777777777"; // Замініть на свій
const PAYPAL_CLIENT_ID = "AYCEg6T_X8UwCdBxpUdq4RwP70dtI6yJKNacl3xdGDF859sFg5C8Z_7VL9zti3zj2BWAmngTQu_hQiOn"; // Замініть на свій реальний Client ID з PayPal Developer

export async function renderSubscribe(user, auth, db, onBack, onToProfile, onToVault, onToSettings) {
    const root = document.getElementById("root");
    
    // Додаємо скрипт PayPal, якщо його ще немає
    if (!document.getElementById('paypal-sdk')) {
        const script = document.createElement('script');
        script.id = 'paypal-sdk';
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
        document.head.appendChild(script);
    }

    root.innerHTML = `
        <style>
            .payment-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center; z-index: 1000; }
            .pay-box { background: #1e293b; padding: 30px; border-radius: 20px; width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
            .crypto-address { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 15px 0; border: 1px solid var(--accent); color: #4ade80; }
        </style>

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
            <div style="max-width: 900px; margin: 0 auto;">
                <h1 style="text-align: center; margin-bottom: 10px; font-size: 2.5rem;">Оберіть свій рівень безпеки</h1>
                <p style="text-align: center; color: var(--text-dim); margin-bottom: 50px;">Керуйте своїми даними без обмежень</p>
                
                <div id="content_area" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px;">
                    </div>
            </div>
        </div>

        <div id="modal_crypto" class="payment-modal">
            <div class="pay-box">
                <h3>Оплата криптовалютою (USDT TRC20)</h3>
                <p style="font-size: 14px; color: var(--text-dim);">Надішліть точно <b>$4.99</b> на адресу нижче:</p>
                <div class="crypto-address">${CRYPTO_WALLET}</div>
                <button id="btn_copy_crypto" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 15px; border-radius: 5px; cursor: pointer; margin-bottom: 20px;">📋 Копіювати адресу</button>
                <div style="font-size: 12px; color: #eab308; margin-bottom: 20px;">Після оплати підписка активується оператором протягом 15 хв.</div>
                <button id="btn_paid_crypto" style="width: 100%; padding: 12px; background: #22c55e; border: none; border-radius: 10px; color: white; font-weight: bold; cursor: pointer;">Я оплатив</button>
                <button onclick="document.getElementById('modal_crypto').style.display='none'" style="margin-top: 15px; background: none; border: none; color: var(--text-dim); cursor: pointer;">Скасувати</button>
            </div>
        </div>

        <div id="modal_paypal" class="payment-modal">
            <div class="pay-box">
                <h3>Оплата через PayPal</h3>
                <div id="paypal-button-container" style="margin-top: 20px;"></div>
                <button onclick="document.getElementById('modal_paypal').style.display='none'" style="margin-top: 15px; background: none; border: none; color: var(--text-dim); cursor: pointer;">Закрити</button>
            </div>
        </div>
    `;

    setupBasicNavigation(user, auth, db, onBack, onToProfile, onToVault, onToSettings);

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.exists() ? userSnap.data() : { plan: "free" };
        const isPro = userData.plan === "pro" && (userData.expiresAt || 0) > Date.now();

        document.getElementById('plan_status').innerHTML = isPro ? '<span style="color:#eab308">PRO ✨</span>' : '<span style="color:#3b82f6">FREE</span>';

        document.getElementById('content_area').innerHTML = `
            <div class="glass-card" style="padding: 35px; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="color: var(--text-dim);">FREE</h3>
                <div style="font-size: 3rem; font-weight: bold; margin: 15px 0;">$0</div>
                <ul style="list-style: none; padding: 0; line-height: 2;">
                    <li>✅ До 10 паролів</li>
                    <li>✅ Базовий захист</li>
                </ul>
                <button disabled style="width:100%; padding:12px; margin-top:20px; border-radius:10px; border:none; background:rgba(255,255,255,0.05); color:var(--text-dim);">
                    Поточний план
                </button>
            </div>

            <div class="glass-card" style="padding: 35px; border: 2px solid #eab308; background: rgba(234, 179, 8, 0.05);">
                <h3 style="color: #eab308;">PRO ✨</h3>
                <div style="font-size: 3rem; font-weight: bold; margin: 15px 0;">$4.99<span style="font-size: 1rem;">/міс</span></div>
                <ul style="list-style: none; padding: 0; line-height: 2;">
                    <li>✅ <b>Безліміт</b> всього</li>
                    <li>✅ 2FA Автентифікатор</li>
                    <li>✅ Хмарна синхронізація</li>
                </ul>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <button id="btn_pay_paypal" style="padding: 15px; background: #0070ba; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">💳 Оплатити PayPal</button>
                    <button id="btn_pay_crypto" style="padding: 15px; background: #22c55e; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">₿ Оплатити Криптою</button>
                </div>
            </div>
        `;

        // --- ЛОГІКА ОПЛАТИ ---

        // 1. PayPal
        document.getElementById('btn_pay_paypal').onclick = () => {
            document.getElementById('modal_paypal').style.display = 'flex';
            renderPayPalButtons(user, db);
        };

        // 2. Crypto
        document.getElementById('btn_pay_crypto').onclick = () => {
            document.getElementById('modal_crypto').style.display = 'flex';
        };

        document.getElementById('btn_copy_crypto').onclick = () => {
            navigator.clipboard.writeText(CRYPTO_WALLET);
            alert("Адресу скопійовано!");
        };

        document.getElementById('btn_paid_crypto').onclick = async () => {
    // Визначаємо кнопку, щоб не було помилки "btn is not defined"
    const btnElement = document.getElementById('btn_paid_crypto');
    
    try {
        btnElement.disabled = true;
        btnElement.innerText = "Надсилаємо...";

        // Імпортуємо функції Firebase (якщо вони ще не імпортовані зверху файлу)
        const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        
        // Записуємо в базу даних
        await addDoc(collection(db, "payment_requests"), {
            uid: user.uid,
            email: user.email,
            amount: "4.99",
            currency: "USDT TRC20",
            status: "pending",
            timestamp: Date.now()
        });

        // Тепер викликаємо функцію сповіщення
        await sendTelegramNotification(user.email);

        alert("🚀 Заявка прийнята! Адмін перевірить транзакцію і активує PRO протягом 15 хв.");
        document.getElementById('modal_crypto').style.display = 'none';

    } catch (e) {
        console.error("Помилка при обробці оплати:", e);
        alert("Помилка при надсиланні заявки. Спробуйте ще раз.");
    } finally {
        // Повертаємо кнопку в робочий стан
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerText = "Я оплатив";
        }
    }
};

    } catch (e) {
        console.error(e);
    }
}
async function sendTelegramNotification(userEmail) {
    const token = "5885495961:AAHTgHwngCc1G8A1-WrUm9Bd5n76n32X5bk"; // Встав свій токен від @BotFather
    const chatId = "-723349476";   // Встав свій ID від @userinfobot
    const message = `🔔 <b>НОВА ЗАЯВКА НА PRO</b>\n📧 Користувач: ${userEmail}\n💰 Метод: USDT TRC20\n💵 Сума: $4.99`;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.error("Помилка Telegram сповіщення:", e);
    }
}
async function activatePro(user, db) {
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, "users", user.uid), {
        plan: "pro",
        expiresAt: expiresAt
    });
    alert('🎉 PRO активовано! Сторінка буде оновлена.');
    window.location.reload();
}

function renderPayPalButtons(user, db) {
    const container = document.getElementById('paypal-button-container');
    
    // ВАЖЛИВО: Очищуємо контейнер перед рендерингом, щоб кнопки не дублювалися
    container.innerHTML = ''; 

    if (window.paypal) {
        window.paypal.Buttons({
            style: {
                layout: 'vertical',
                color:  'gold',
                shape:  'rect',
                label:  'paypal'
            },
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: '4.99'
                        }
                    }]
                });
            },
            onApprove: (data, actions) => {
                return actions.order.capture().then(details => {
                    activatePro(user, db);
                });
            },
            onError: (err) => {
                console.error('PayPal Error:', err);
                alert('Сталася помилка при завантаженні PayPal. Спробуйте ще раз.');
            }
        }).render('#paypal-button-container');
    }
}

function setupBasicNavigation(user, auth, db, onBack, onToProfile, onToVault, onToSettings) {
    const bindNav = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => fn ? fn(user) : null;
    };
    bindNav("m_profile", onToProfile);
    bindNav("m_vault", onToVault);
    bindNav("m_settings", onToSettings);
    document.getElementById("btn_logout").onclick = () => signOut(auth);
}