const express = require('express');
const bodyParser = require('body-parser');
//const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const app = express();
//const git = simpleGit('C:/DigitalBonesBox'); // Local repo path

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve the HTMX page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'editor', 'push.html'));
});

// Endpoint for the publish action
app.post('/publish', async (req, res) => {
    const { fileName, jsonData } = req.body;
    const filePath = path.join('C:/DigitalBonesBox', 'databones', fileName);

    try {
        // Checkout to the data branch
        await git.checkout('data');

        // Save the JSON data to a file
        fs.writeFileSync(filePath, jsonData);

        // Git operations: add, commit, and push to the data branch
        await git.add(filePath);
        const commitMessage = `Automated publish at ${new Date().toISOString()}`;
        await git.commit(commitMessage);
        await git.push('origin', 'data');

        // Switch back to the main branch
        await git.checkout('main');

        res.send('Publish successful! Changes pushed to the data branch.');
    } catch (error) {
        console.error('Publish failed:', error);
        // Attempt to switch back to main in case of error
        try {
            await git.checkout('main');
        } catch (checkoutError) {
            console.error('Failed to switch back to the main branch:', checkoutError);
        }
        res.status(500).send('Publish failed. Check server logs for details.');
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
