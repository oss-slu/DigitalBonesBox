const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const cors = require('cors'); // Add this line

const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files
app.use(express.static(__dirname));

// Route for boneset.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'boneset.html'));
});

// Test endpoint to verify server is working
app.get('/test', (req, res) => {
    res.json({ message: "Server is working!" });
});

// Combined data endpoint
app.get('/combined-data', async (req, res) => {
    console.log("Received request for /combined-data"); // Log to verify the endpoint is hit

    try {
        // Mock data that matches your frontend's expected structure
        const mockData = {
            bonesets: [
                { id: '1', name: 'Bony Pelvis' }
            ],
            bones: [
                { id: '101', name: 'Sacrum', boneset: '1' },
                { id: '102', name: 'Coccyx', boneset: '1' }
            ],
            subbones: [
                { id: '1001', name: 'Base', bone: '101' }
            ]
        };

        console.log("Sending mock data:", mockData); // Log the data being sent
        res.json(mockData);
    } catch (error) {
        console.error("Error in /combined-data:", error);
        res.status(500).json({ error: "Failed to load data" });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});