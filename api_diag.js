const http = require('http');

const request = (options, data = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(body)); } catch { resolve(body); }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
};

async function main() {
    try {
        console.log('Logging in...');
        const auth = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'admin@initqa.com', password: 'admin123' });

        const token = auth.access_token;
        console.log('Token obtained.');

        console.log('Fetching scenarios...');
        const scenarios = await request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/web-scenarios',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (scenarios.length === 0) {
            console.log('No scenarios found.');
            return;
        }

        console.log(`Found ${scenarios.length} scenarios. Latest:`, scenarios[0].name);
        console.log('Steps Count:', scenarios[0].steps ? scenarios[0].steps.length : 'N/A');
        console.log('Steps:', JSON.stringify(scenarios[0].steps, null, 2));

        const projectId = scenarios[0].projectId;
        console.log('Fetching project history for project:', projectId);
        const history = await request({
            hostname: 'localhost',
            port: 3000,
            path: `/api/web-scenarios/project-history/${projectId}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Latest history entry:');
        if (history.length > 0) {
            console.log(JSON.stringify(history[0], null, 2));
        } else {
            console.log('No history found for this project.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();
