const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const git = simpleGit('C:\\DigitalBonesBox'); 

app.use(express.static('public'));
app.use(bodyParser.json());

// Endpoint to commit and push changes
app.post('/publish', async (req, res) => {
    const { message } = req.body;

    try {
        await git.add('./*'); // Add all changes
        await git.commit(`Automated publish at ${new Date().toISOString()}: ${message}`);
        await git.push('origin', 'data'); // Push to the 'data' branch

        res.status(200).send('Changes published successfully!');
    } catch (error) {
        console.error('Error publishing changes:', error);
        res.status(500).send('Failed to publish changes.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
