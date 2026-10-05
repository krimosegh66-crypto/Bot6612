// الكائنات الأساسية وعناصر الواجهة
const cryptoSelect = document.getElementById('crypto-select');
const currentPriceEl = document.getElementById('current-price');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const miningProgress = document.getElementById('mining-progress');
const hashrateValue = document.getElementById('hashrate-value');

const sessionCryptoEl = document.getElementById('session-crypto');
const sessionUsdEl = document.getElementById('session-usd');
const totalCryptoEl = document.getElementById('total-crypto');
const totalUsdEl = document.getElementById('total-usd');

const withdrawForm = document.getElementById('withdraw-form');
const walletAddressInput = document.getElementById('wallet-address');
const withdrawMessage = document.getElementById('withdraw-message');
const logsTableBody = document.querySelector('#logs-table tbody');

// عناصر واجهة Web3 الجديدة
const btnConnect = document.getElementById('btn-connect');
const walletInfo = document.getElementById('wallet-info');
const userAddressEl = document.getElementById('user-address');
const userEthBalanceEl = document.getElementById('user-eth-balance');

// المتغيرات التشغيلية وحالة التطبيق
let cryptoPrices = { bitcoin: 0, ethereum: 0, dogecoin: 0, litecoin: 0 };
let activeCrypto = 'bitcoin';
let isMining = false;
let miningInterval = null;
let priceInterval = null;

// تعديل معدل الربح بما يتوافق مع زيادة سرعة التعدين (100 - 600 MH/s) لجعل الأرقام منطقية
const baseRewards = {
    bitcoin: 0.00000025,  
    ethereum: 0.0000052,   
    dogecoin: 0.65,        
    litecoin: 0.00015      
};

// تحميل البيانات المخزنة من Local Storage
let balances = JSON.parse(localStorage.getItem('mining_balances')) || {
    bitcoin: 0, ethereum: 0, dogecoin: 0, litecoin: 0
};
let sessionBalances = { bitcoin: 0, ethereum: 0, dogecoin: 0, litecoin: 0 };

// 1. منطق الاتصال بمحفظة MetaMask وقراءة الرصيد الأصلي الحقيقي
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // طلب الاتصال بحساب MetaMask الخاص بالمستخدم
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            
            userAddressEl.innerText = account;
            walletAddressInput.value = account; // تعبئة حقل عنوان محفظة السحب تلقائياً لراحتك
            
            // جلب الرصيد الحقيقي من شبكة الإيثيريوم للحساب المتصل
            const balanceHex = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [account, 'latest']
            });
            
            // تحويل الرصيد من النظام الست عشرى (Hexadecimal Wei) إلى عملة الـ Ether الحقيقية
            const balanceWei = parseInt(balanceHex, 16);
            const balanceEth = (balanceWei / Math.pow(10, 18)).toFixed(4);
            
            userEthBalanceEl.innerText = balanceEth;
            
            // إظهار قسم بيانات المحفظة وتبديل نص الزر
            walletInfo.style.display = 'block';
            btnConnect.innerText = 'تم ربط المحفظة بنجاح ✓';
            btnConnect.style.background = '#22c55e';
            
            addLog(`تم ربط محفظة MetaMask بنجاح. الحساب الحالي يمتلك ${balanceEth} ETH حقيقي.`, 0, 0);
        } catch (error) {
            console.error(error);
            alert('رفض المستخدم إذن الاتصال بالمحفظة أو حدث خطأ.');
        }
    } else {
        alert('إضافة MetaMask غير مثبتة في متصفحك! يرجى تثبيتها أولاً لتتمكن من قراءة رصيدك الحقيقي.');
    }
}

// 2. استدعاء الأسعار المباشرة من CoinGecko API
async function fetchPrices() {
    try {
        const response = await fetch('https://coingecko.com');
        const data = await response.json();
        
        cryptoPrices.bitcoin = data.bitcoin.usd;
        cryptoPrices.ethereum = data.ethereum.usd;
        cryptoPrices.dogecoin = data.dogecoin.usd;
        cryptoPrices.litecoin = data.litecoin.usd;

        updatePriceDisplay();
        updateUIValues();
        addLog("تحديث أسعار العملات المباشرة من السوق تلقائياً", 0, 0);
    } catch (error) {
        console.error("فشل جلب الأسعار الحية:", error);
        currentPriceEl.innerText = "خطأ في الاتصال بالسوق";
    }
}

function updatePriceDisplay() {
    const symbols = { bitcoin: 'BTC', ethereum: 'ETH', dogecoin: 'DOGE', litecoin: 'LTC' };
    const price = cryptoPrices[activeCrypto];
    currentPriceEl.innerText = `$${price.toLocaleString()} USD / ${symbols[activeCrypto]}`;
}

function updateUIValues() {
    const price = cryptoPrices[activeCrypto];
    sessionCryptoEl.innerText = sessionBalances[activeCrypto].toFixed(8);
    sessionUsdEl.innerText = `$${(sessionBalances[activeCrypto] * price).toFixed(4)}`;
    totalCryptoEl.innerText = balances[activeCrypto].toFixed(8);
    totalUsdEl.innerText = `$${(balances[activeCrypto] * price).toFixed(4)}`;
}

// 3. بدء محاكاة التعدين بالسرعة القوية المطلوبة (100 - 600 MH/s)
function startMining() {
    if (isMining) return;
    
    isMining = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    cryptoSelect.disabled = true;
    miningProgress.classList.add('active');
    miningProgress.style.width = "100%";

    addLog(`بدء محاكاة التعدين للعملة المحددة بالطاقة القصوى المحدثة`, 0, 0);

    miningInterval = setInterval(() => {
        // توليد عشوائي مستمر لسرعة التعدين لتتراوح ديناميكياً بين 100 و 600 MH/s
        const generatedHashrate = (Math.random() * (600 - 100) + 100).toFixed(2);
        hashrateValue.innerText = `${generatedHashrate} MH/s`;

        const reward = baseRewards[activeCrypto];
        sessionBalances[activeCrypto] += reward;
        balances[activeCrypto] += reward;

        localStorage.setItem('mining_balances', JSON.stringify(balances));
        updateUIValues();
    }, 1000);
}

function stopMining() {
    if (!isMining) return;

    isMining = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    cryptoSelect.disabled = false;
    miningProgress.classList.remove('active');
    miningProgress.style.width = "0%";
    hashrateValue.innerText = "0 MH/s";

    clearInterval(miningInterval);
    addLog(`تم إيقاف التعدين مؤقتاً والاحتفاظ بالأرباح المتراكمة.`, 0, 0);
}

// 4. إضافة العمليات إلى الجدول
function addLog(action, amount, usdValue) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG');
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${timeStr}</td>
        <td>${action}</td>
        <td>${amount > 0 ? amount.toFixed(8) : '-'}</td>
        <td>${usdValue > 0 ? `\$\${usdValue.toFixed(2)}` : '-'}</td>
    `;
    logsTableBody.insertBefore(row, logsTableBody.firstChild);
}

// 5. معالجة سحب الأرباح المحاكاتية وإعادة التصفير
withdrawForm.addEventListener('submit', function() {
    const address = walletAddressInput.value.trim();
    const currentTotal = balances[activeCrypto];
    const currentPrice = cryptoPrices[activeCrypto];
    const usdValue = currentTotal * currentPrice;

    if (address.length < 26) {
        alert("تنبيه: يرجى إدخال عنوان محفظة رقمية صالح أو ربط MetaMask أولاً.");
        return;
    }

    if (currentTotal <= 0) {
        alert("رصيد الأرباح المتراكمة فارغ، يرجى تشغيل التعدين أولاً لتجميع الأرباح.");
        return;
    }

    withdrawMessage.className = "alert-message alert-success";
    withdrawMessage.innerHTML = `<strong>تمت المحاكاة للتوقيع والتحويل بنجاح!</strong><br>
    تم طلب نقل <strong>${currentTotal.toFixed(8)} ${activeCrypto.toUpperCase()}</strong> ($${usdValue.toFixed(2)}) إلى حسابك رقم: <code>${address}</code>.<br>
    *تنبيه أمان شبكة Web3: هذه عملية محاكاة تجريبية مخصصة للواجهات البرمجية فقط ولا تخصم غاز حقيقي (Gas Fees) من محفظتك.`;
    withdrawMessage.style.display = "block";

    addLog(`طلب سحب تجريبي للأرباح المتراكمة بناءً على ربط Web3`, currentTotal, usdValue);

    balances[activeCrypto] = 0;
    sessionBalances[activeCrypto] = 0;
    localStorage.setItem('mining_balances', JSON.stringify(balances));
    
    updateUIValues();
    walletAddressInput.value = "";
});

// مراقبة أحداث تغيير القائمة والأزرار
cryptoSelect.addEventListener('change', (e) => {
    activeCrypto = e.target.value;
    updatePriceDisplay();
    updateUIValues();
});

btnStart.addEventListener('click', startMining);
btnStop.addEventListener('click', stopMining);
btnConnect.addEventListener('click', connectWallet); // زر ربط المحفظة الجديد

// تشغيل التطبيق المباشر وتحديث الأسعار كل 5 دقائق
fetchPrices();
priceInterval = setInterval(fetchPrices, 300000);
