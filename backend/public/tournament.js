document.addEventListener('DOMContentLoaded', async () => {
    const bracketContainer = document.getElementById('bracketContainer');
    const tabBtns = document.querySelectorAll('.tab-btn');
    let currentCategory = "Men's Singles";

    async function fetchData(category) {
        bracketContainer.innerHTML = '<div style="text-align: center; width: 100%; color: var(--text-dim);">Loading...</div>';
        try {
            const [scheduleRes, participantsRes] = await Promise.all([
                fetch(`/api/schedule?category=${encodeURIComponent(category)}`),
                fetch('/api/participants')
            ]);
            
            const matches = await scheduleRes.json();
            const participants = await participantsRes.json();
            
            // Map participants by their registration order (seed) per category
            // Filter participants by the current category
            const categoryParticipants = participants.filter(p => p.category === category);
            const seeds = [...categoryParticipants].reverse();
            
            renderSchedule(matches, seeds);
        } catch (err) {
            console.error(err);
            bracketContainer.innerHTML = '<div style="color: red; text-align: center;">Failed to load schedule. Please try again later.</div>';
        }
    }

    function renderSchedule(matches, seeds) {
        if (!matches || matches.length === 0) {
            bracketContainer.innerHTML = '<div style="text-align: center; width: 100%; color: var(--text-dim);">No tournament scheduled for this category yet.</div>';
            return;
        }

        bracketContainer.innerHTML = '';

        const rounds = {};
        matches.forEach(m => {
            if (!rounds[m.round]) rounds[m.round] = [];
            rounds[m.round].push(m);
        });

        const roundNumbers = Object.keys(rounds).sort((a, b) => a - b);
        
        roundNumbers.forEach(r => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'round';
            
            let roundName = `Round ${r}`;
            if (r == roundNumbers.length - 1 && roundNumbers.length > 2) roundName = "Semifinals";
            if (r == roundNumbers.length && roundNumbers.length > 1) roundName = "Finals";
            
            roundDiv.innerHTML = `<h2 class="round-title">${roundName}</h2>`;

            rounds[r].forEach(m => {
                const matchCard = document.createElement('div');
                matchCard.className = 'match-card';
                matchCard.style.animation = `fadeInUp 0.5s ease forwards`;
                
                const timeStr = m.startTime ? new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'BYE';
                const courtStr = m.court ? `Court ${m.court}` : '';

                let p1Display = m.player1;
                let p2Display = m.player2;

                if (m.round === 1) {
                    if (m.player1Seed && seeds[m.player1Seed - 1]) {
                        p1Display = seeds[m.player1Seed - 1].name;
                        if (seeds[m.player1Seed - 1].teamName) p1Display += ` (${seeds[m.player1Seed - 1].teamName})`;
                    }
                    if (m.player2Seed && seeds[m.player2Seed - 1]) {
                        p2Display = seeds[m.player2Seed - 1].name;
                        if (seeds[m.player2Seed - 1].teamName) p2Display += ` (${seeds[m.player2Seed - 1].teamName})`;
                    }
                } else {
                    if (m.player1From) p1Display = `Winner of Match ${m.player1From}`;
                    if (m.player2From) p2Display = `Winner of Match ${m.player2From}`;
                }

                matchCard.innerHTML = `
                    <div class="match-meta">
                        <span>#${m.matchIndex}</span>
                        <span>${timeStr} ${courtStr ? '• ' + courtStr : ''}</span>
                    </div>
                    <div class="player-row ${m.winner === m.player1 ? 'winner' : ''}">
                        <span class="player-name">${p1Display}</span>
                    </div>
                    ${m.isBye ? '' : `
                        <div class="vs">VS</div>
                        <div class="player-row ${m.winner === m.player2 ? 'winner' : ''}">
                            <span class="player-name">${p2Display}</span>
                        </div>
                    `}
                `;
                roundDiv.appendChild(matchCard);
            });
            bracketContainer.appendChild(roundDiv);
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            fetchData(currentCategory);
        });
    });

    fetchData(currentCategory);
});
