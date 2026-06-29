export const handleLogout = async function() {
    const mobAuthBtn = document.getElementById('mobile-auth-btn');
    const mobProfBtn = document.getElementById('mobile-profile-btn');
    if (mobAuthBtn && mobProfBtn) {
        mobAuthBtn.classList.remove('hidden');
        mobProfBtn.classList.add('hidden');
    }

    try {
        await window.supabaseClient.auth.signOut();
    } catch (error) {}

    window.isLoggedIn = false;
    window.currentUser = null;
    window.cart = [];
    window.wishlist = [];
    localStorage.setItem('ateeq_cart', JSON.stringify([]));
    localStorage.setItem('ateeq_wishlist', JSON.stringify([]));

    if (typeof window.saveCart === 'function') window.saveCart();
    if (typeof window.saveWishlist === 'function') window.saveWishlist();

    const chkEmail = document.getElementById('chk-email');
    if (chkEmail) chkEmail.value = '';

    if (typeof window.toggleSettingsModal === 'function') {
        const modal = document.getElementById('settings-modal');
        if (modal && !modal.classList.contains('hidden')) window.toggleSettingsModal();
    }

    const navAuthBtn = document.getElementById('nav-auth-btn');
    const navProfileBtn = document.getElementById('nav-profile-btn');
    if (navAuthBtn) navAuthBtn.style.display = '';
    if (navProfileBtn) navProfileBtn.style.display = 'none';

    if (typeof window.switchView === 'function') window.switchView('home');
    if (typeof window.showToast === 'function') window.showToast('Logged out successfully.', 'info');
};

export const __handleRegister = async function(e) {
    if (e) e.preventDefault();
    const emailEl = document.getElementById('reg-email');
    const passEl = document.getElementById('reg-password');
    const nameEl = document.getElementById('reg-name');
    const email = emailEl ? emailEl.value : '';
    const password = passEl ? passEl.value : '';
    const fullName = nameEl ? nameEl.value : '';

    if (!email || !password || !fullName) {
        if (typeof window.showToast === 'function') window.showToast('Please fill all fields.', 'error');
        return;
    }

    try {
        const { data, error } = await window.supabaseClient.auth.signUp({ email: email, password: password });
        if (error) throw error;

        if (data && data.user) {
            try {
                await window.supabaseClient.from('profiles').insert([{ id: data.user.id, full_name: fullName }]);
            } catch (pErr) {}

            window.isLoggedIn = true;
            window.currentUser = data.user;
            const navAuthBtn = document.getElementById('nav-auth-btn');
            const navProfileBtn = document.getElementById('nav-profile-btn');
            if (navAuthBtn) navAuthBtn.style.display = 'none';
            if (navProfileBtn) {
                navProfileBtn.classList.remove('hidden');
                navProfileBtn.style.display = 'block';
            }
            if (typeof window.fetchUserWishlist === 'function') window.fetchUserWishlist();
            if (typeof window.showToast === 'function') window.showToast('Account created successfully!', 'success');
            if (typeof window.toggleAuthModal === 'function') window.toggleAuthModal();
            if (typeof window.switchView === 'function') window.switchView('profile');
        }
    } catch (error) {
        if (typeof window.showToast === 'function') window.showToast(error.message || 'Registration failed', 'error');
    }
};

export const __handleLogin = async function(e) {
    if (e) e.preventDefault();
    const mobAuthBtn = document.getElementById('mobile-auth-btn');
    const mobProfBtn = document.getElementById('mobile-profile-btn');
    if (mobAuthBtn && mobProfBtn) {
        mobAuthBtn.classList.add('hidden');
        mobProfBtn.classList.remove('hidden');
    }

    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const email = emailEl ? emailEl.value : '';
    const password = passEl ? passEl.value : '';

    if (!email || !password) {
        if (typeof window.showToast === 'function') window.showToast('Please enter your email and password.', 'error');
        return;
    }

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email: email, password: password });
        if (error) throw error;

        if (data && data.user) {
            window.isLoggedIn = true;
            window.currentUser = data.user;

            const navAuthBtn = document.getElementById('nav-auth-btn');
            const navProfileBtn = document.getElementById('nav-profile-btn');
            if (navAuthBtn) navAuthBtn.style.display = 'none';
            if (navProfileBtn) {
                navProfileBtn.classList.remove('hidden');
                navProfileBtn.style.display = 'block';
            }

            if (typeof window.fetchUserWishlist === 'function') window.fetchUserWishlist();
            if (typeof window.showToast === 'function') window.showToast('Welcome back to ATEEQ!', 'success');
            if (typeof window.toggleAuthModal === 'function') window.toggleAuthModal();
            if (typeof window.switchView === 'function') window.switchView('profile');
        }
    } catch (error) {
        if (typeof window.showToast === 'function') window.showToast('Invalid Email or Password!', 'error');
    }
};

export const fetchUserOrders = async function() {
    if (!window.isLoggedIn || !window.currentUser) return;
    const container = document.getElementById('orders-container');
    if (!container) return;

    try {
        const { data: orders, error } = await window.supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', window.currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        window.userOrders = orders || [];

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center text-center mt-10">
                    <i class="fa-solid fa-box-open text-4xl text-[#333] mb-4"></i>
                    <p class="text-gray-500 text-xs tracking-widest uppercase">You haven't placed any orders yet.</p>
                </div>`;
            return;
        }
        container.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const statusColor = order.status === 'Pending' ? 'text-yellow-500 border-yellow-500' : 'text-green-500 border-green-500';
            return `
            <div onclick="window.openUserOrderModal('${order.id}')" class="border border-[#222] p-6 bg-[#050505] cursor-pointer hover:border-gray-500 transition-all duration-300 mb-4">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <p class="text-gray-500 text-[10px] tracking-widest uppercase mb-1">Order #${order.serial_number} (Click for details)</p>
                        <p class="text-white text-xs tracking-widest uppercase font-bold">Placed on ${date}</p>
                    </div>
                    <span class="text-[10px] tracking-widest uppercase font-bold border px-3 py-1 rounded-full ${statusColor}">${order.status}</span>
                </div>
                <div class="border-t border-[#222] pt-6 flex justify-between items-center">
                    <div>
                        <p class="text-gray-400 text-[10px] tracking-widest uppercase mb-1">Payment Method</p>
                        <p class="text-white text-xs tracking-widest uppercase font-bold">${order.payment_method}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-gray-400 text-[10px] tracking-widest uppercase mb-1">Total Amount</p>
                        <p class="text-white text-lg tracking-widest font-bold">${order.total_amount} EGP</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (error) {}
};