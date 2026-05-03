const globalToken = localStorage.getItem('token');
if (!globalToken) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const authLinks = document.getElementById('authLinks');
    const token = localStorage.getItem('token');
    
    if (authLinks) {
        if (token) {
            authLinks.innerHTML = `
                <a href="#" id="logoutBtn" style="color: #ef4444;">Logout</a>
            `;
            document.getElementById('logoutBtn').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                window.location.reload();
            });
        } else {
            authLinks.innerHTML = `
                <a href="login.html" style="color: #4facfe;">Login / Sign Up</a>
            `;
        }
    }
});

const categorySelect = document.getElementById('category');
const teamNameGroup = document.getElementById('teamNameGroup');

if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
        if (e.target.value.includes('Doubles')) {
            teamNameGroup.style.display = 'block';
        } else {
            teamNameGroup.style.display = 'none';
        }
    });
}

function showPopup(message, isSuccess) {
    const overlay = document.getElementById('toastOverlay');
    const toast = document.getElementById('toast');

    toast.innerText = message;
    toast.style.background = isSuccess ? '#22c55e' : '#ef4444';
    overlay.style.display = 'flex';

    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'scale(1)';
            toast.style.opacity = '1';
        });
    });

    const duration = isSuccess ? 3000 : 5000;
    setTimeout(() => {
        toast.style.transform = 'scale(0.8)';
        toast.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }, duration);
}

const registrationForm = document.getElementById('registrationForm');
if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        const btn = e.target.querySelector('button');

        btn.disabled = true;
        btn.innerText = 'Registering...';

        const token = localStorage.getItem('token');

        if (!token) {
            showPopup('❌ Please login to register for the tournament.', false);
            btn.disabled = false;
            btn.innerText = 'Complete Registration';
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.status === 401) {
                showPopup('❌ Session expired or invalid. Please login again.', false);
                localStorage.removeItem('token');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }

            if (response.ok) {
                showPopup('✅ Registration Completed Successfully!\n🏸 Welcome to Saanvika Premier League', true);
                e.target.reset();
                if (teamNameGroup) teamNameGroup.style.display = 'none';
            } else {
                showPopup(result.error || '❌ Registration Failed', false);
            }
        } catch (err) {
            console.error(err);
            showPopup('❌ Failed to connect to server', false);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Complete Registration';
        }
    });
}
