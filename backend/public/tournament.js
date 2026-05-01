document.addEventListener('DOMContentLoaded', async () => {
    const bracketContainer = document.getElementById('bracketContainer');
    const tabBtns = document.querySelectorAll('.tab-btn');
    let currentCategory = "Men's Singles";

    async function fetchData(category) {
        try {
            const res = await fetch(`/api/schedule?category=${encodeURIComponent(category)}`);
            const matches = await res.json();
            renderSchedule(matches);
        } catch (err) {
            console.error(err);
            bracketContainer.innerHTML = '<div style="color: red; text-align: center;">Failed to load schedule.</div>';
        }
    }

    function renderSchedule(matches) {
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
                matchCard.className = `match-card ${m.status === 'live' ? 'live-match' : ''}`;
                
                const timeStr = m.startTime ? new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';
                const courtStr = m.court ? `Court ${m.court}` : '';

                let p1Display = m.player1 || "TBD";
                let p2Display = m.player2 || "TBD";

                matchCard.innerHTML = `
                    <div class="match-meta">
                        <span>#${m.matchIndex} ${m.status === 'live' ? '<span class="live-badge">LIVE</span>' : ''}</span>
                        <span>${m.isBye ? 'BYE' : `${timeStr} ${courtStr ? '• ' + courtStr : ''}`}</span>
                    </div>
                    <div class="player-row ${m.winner && m.winner === m.player1 ? 'winner' : ''}">
                        <span class="player-name">${p1Display}</span>
                        ${!m.isBye ? `<span class="score">${m.score1 || 0}</span>` : ''}
                    </div>
                    ${m.isBye ? '' : `
                        <div class="vs">VS</div>
                        <div class="player-row ${m.winner && m.winner === m.player2 ? 'winner' : ''}">
                            <span class="player-name">${p2Display}</span>
                            <span class="score">${m.score2 || 0}</span>
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

    // Initial load
    fetchData(currentCategory);

    // Auto-refresh every 30 seconds for live updates
    setInterval(() => fetchData(currentCategory), 30000);
});
