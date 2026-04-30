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

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const btn = e.target.querySelector('button');
    const toast = document.getElementById('toast');

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
            toast.innerText = 'Registration Successful!';
            toast.classList.add('show');
            e.target.reset();
            if (teamNameGroup) teamNameGroup.style.display = 'none';
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        } else {
            alert('Error: ' + result.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to connect to server');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Complete Registration';
    }
});
