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

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const btn = e.target.querySelector('button');

    btn.disabled = true;
    btn.innerText = 'Registering...';

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

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
