const express = require('express');
const simpleGit = require('simple-git');
const path = require('path'); // Import the path module
require('dotenv').config();

const app = express();
const git = simpleGit();

// Serve static files from the DigitalBonesBox directory
app.use(express.static(path.join(__dirname))); // This will correctly point to the directory with Button.html

// Middleware to parse incoming JSON
app.use(express.json());

// POST endpoint for /publish
app.post('/publish', async (req, res) => {
  try {
    const directoriesToCommit = [
      path.join(__dirname, 'Data_Directory', 'Annotation_Directory'), // Correct path to Annotation_Directory
      path.join(__dirname, 'Data_Directory', 'Bone_Directory'),       // Correct path to Bone_Directory
      path.join(__dirname, 'Data_Directory', 'Image_Directory')       // Correct path to Image_Directory
    ];

    await git.add(directoriesToCommit);
    await git.commit('Automated publish commit');
    await git.push('origin', 'Publish_Button');

    res.status(200).send({ message: 'Publish action completed successfully' });
  } catch (error) {
    console.error('Error during publish:', error);
    res.status(500).send({ message: 'Failed to publish', error });
  }
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
