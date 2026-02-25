// static/templates/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Session Protection Logic (Run on non-login pages)
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');

    // Check session
    const userRole = sessionStorage.getItem('userRole');

    if (!userRole && !isLoginPage) {
        // Redirect to login if trying to access secure pages without session
        window.location.href = 'login.html';
        return;
    }

    if (userRole && isLoginPage) {
        // Redirect to dashboard if already logged in and visiting login page
        window.location.href = 'index.html';
        return;
    }

    // 2. Login Form Submission Logic
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const errorDiv = document.getElementById('loginError');
            const loginBtn = document.getElementById('loginBtn');
            const loginBtnText = document.getElementById('loginBtnText');

            // Disallow file:// execution
            if (window.location.protocol === 'file:') {
                loginBtn.disabled = false;
                loginBtnText.innerText = 'Sign In to Portal';
                errorDiv.classList.remove('hidden');
                errorDiv.innerText = "Error: App cannot run from file://. Please use http://127.0.0.1:8000";
                return;
            }

            try {
                // Initialize Supabase Native Auth dynamically
                if (!window.supabaseClient) {
                    const configRes = await fetch('/api/auth/config');
                    if (!configRes.ok) throw new Error("Could not fetch secure configuration. Is the backend running?");
                    const config = await configRes.json();

                    if (config.supabaseUrl && config.supabaseKey) {
                        window.supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseKey);
                    } else {
                        throw new Error("Supabase config is empty.");
                    }
                }

                let emailToUse = usernameInput;
                if (!emailToUse.includes('@')) {
                    emailToUse = `${emailToUse}@vesak.local`.toLowerCase();
                }

                // 1. Try Native Supabase Authentication
                let nativeSession = null;
                const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
                    email: emailToUse,
                    password: passwordInput,
                });

                if (authError) {
                    // Try fallback to our custom /api/auth/login for unmigrated users (like SAdmin)
                    const fallbackRes = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: usernameInput, password: passwordInput })
                    });

                    if (fallbackRes.ok) {
                        const fallbackData = await fallbackRes.json();
                        // Custom legacy success!
                        sessionStorage.setItem('userRole', fallbackData.user.role);
                        sessionStorage.setItem('userName', fallbackData.user.username);
                        sessionStorage.setItem('accessToken', 'legacy-auth-token');
                        window.location.href = 'index.html';
                        return;
                    } else {
                        throw authError; // Throw original native error
                    }
                }

                if (authData.session) {
                    nativeSession = authData.session;

                    // Success! Fetch Role from custom Users table
                    const { data: userRecord, error: dbError } = await window.supabaseClient
                        .from('users')
                        .select('role, username, is_active, permissions')
                        .eq('username', usernameInput)
                        .single();

                    if (dbError || !userRecord) {
                        throw new Error("User record not found in access control list.");
                    }

                    if (!userRecord.is_active) {
                        throw new Error("Account is disabled. Contact Super Admin.");
                    }

                    // Save to Session Storage
                    sessionStorage.setItem('userRole', userRecord.role);
                    sessionStorage.setItem('userName', userRecord.username);
                    sessionStorage.setItem('userPermissions', JSON.stringify(userRecord.permissions || {}));
                    sessionStorage.setItem('accessToken', nativeSession.access_token);

                    window.location.href = 'index.html';
                }
            } catch (err) {
                console.error("Login Error:", err);
                errorDiv.classList.remove('hidden');

                if (err.message === 'Failed to fetch') {
                    errorDiv.innerHTML = `
                        <div class="font-bold underline mb-1 italic">Network Failure (Failed to Fetch)</div>
                        <div class="text-[10px] leading-tight opacity-90">
                            The browser could not reach the backend API.<br>
                            1. Ensure <b>uvicorn</b> is running in terminal.<br>
                            2. Access via <b>http://127.0.0.1:8000</b> (not file://).
                        </div>
                    `;
                } else {
                    errorDiv.innerText = err.message || 'Invalid credentials or server connection failed.';
                }

                loginBtn.disabled = false;
                loginBtnText.innerText = 'Secure Login';
            }
        });
    }

    // 3. RBAC Render Logic (Run on main portal pages)
    if (!isLoginPage && userRole) {
        applyRoleBasedAccess(userRole);
    }
});

/**
 * Dynamic Permission Helper
 */
window.hasPermission = function (key) {
    const role = sessionStorage.getItem('userRole');
    // Founders and Directors have absolute override
    if (role === 'Founding Member' || role === 'Founder') return true;

    try {
        const perms = JSON.parse(sessionStorage.getItem('userPermissions') || '{}');
        return !!perms[key];
    } catch (e) {
        return false;
    }
};

function applyRoleBasedAccess(role) {
    // Update Profile UI
    const roleDisplay = document.getElementById('userRoleDisplay');
    const nameDisplay = document.getElementById('userNameDisplay');
    if (roleDisplay) roleDisplay.innerText = role;
    if (nameDisplay) nameDisplay.innerText = sessionStorage.getItem('userName');

    // Process Nav Menus and Section visibility based on Role-Hierachy + Dynamic Permissions
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        const target = item.getAttribute('data-target');
        let visible = false;

        // Founding Members & Directors see everything
        if (role === 'Founding Member' || role === 'Founder' || role === 'Director') {
            visible = true;
        } else {
            // Permission based visibility
            if (target === 'dashboard') visible = true; // Dashboard usually always visible
            if (target === 'financials' && window.hasPermission('view_financials')) visible = true;
            if (target === 'adminhub' && window.hasPermission('access_admin_hub')) visible = true;
            if (target === 'officialdocs' && window.hasPermission('access_official_docs')) visible = true;
            if (target === 'inquiry') visible = true;
            if (target === 'service-allocation') visible = true;
        }

        if (!visible) item.classList.add('hidden');
        else item.classList.remove('hidden');
    });

    // Specific restricted panels/actions (View Only)
    if (role === 'View Only') {
        const editActions = document.querySelectorAll('.admin-action, .edit-action, button[type="button"]:not(.nav-item)');
        editActions.forEach(btn => {
            // Protect nav buttons or filter buttons from being hidden if they are just views
            if (!btn.classList.contains('view-action')) {
                btn.style.display = 'none';
            }
        });

        // Make inputs readonly
        setTimeout(() => {
            const inputs = document.querySelectorAll('input:not([type="search"]), select, textarea');
            inputs.forEach(input => {
                input.setAttribute('readonly', 'true');
                if (input.tagName === 'SELECT') {
                    input.setAttribute('disabled', 'true');
                }
            });
        }, 1000); // Small delay to let React/Dynamic DOM load
    }
}

// Add Logout function globally for the UI
window.logoutUser = async function () {
    try {
        if (window.supabaseClient) {
            await window.supabaseClient.auth.signOut();
        }
    } catch (e) {
        console.error("Error signing out native auth", e);
    }
    sessionStorage.clear();
    window.location.href = 'login.html';
};
