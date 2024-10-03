const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const git = simpleGit('C:\\DigitalBonesBox'); // Your local repo path

app.use(express.static('public'));
app.use(bodyParser.json());

// Endpoint to commit and push changes
app.post('/publish', async (req, res) => {
    const { message, jsonData } = req.body;

    // Check if message and jsonData are provided
    if (!message || !jsonData) {
        return res.status(400).send('Message and JSON data are required.');
    }

    // Define the path to the file in the databones folder
    const filePath = path.join('C:\\DigitalBonesBox', 'databones', 'data.json');

    // Write JSON data to the specified file
    try {
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2)); // Save JSON data
    } catch (err) {
        console.error('Error writing file:', err);
        return res.status(500).send('Failed to write data to file.');
    }

    try {
        await git.add('./databones/*'); // Stage changes in the databones folder
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
