// Get the file input and preview elements
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");
const feedbackMessage = document.getElementById("feedbackMessage");

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Function to show feedback and update UI
function showFeedback(message, isError = false) {
    feedbackMessage.textContent = message;
    feedbackMessage.style.color = isError ? '#dc3545' : '#28a745';
}

// Function to validate the uploaded file
function validateFile(file) {
    if (!file) {
        showFeedback("No file selected. Please choose an image.", true);
        return false;
    }

    if (!file.type.startsWith("image/")) {
        showFeedback("Please upload a valid image file (PNG or JPEG).", true);
        return false;
    }

    if (file.size > MAX_FILE_SIZE) {
        showFeedback("The file size should not exceed 10MB. Please choose a smaller image.", true);
        return false;
    }

    showFeedback(""); // Clear any previous feedback
    return true;
}

// Function to display the uploaded image
function displayImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = "Uploaded Bone Image";
            img.style.maxWidth = "50%";
            img.style.height = "auto";

            imagePreview.innerHTML = "";
            imagePreview.appendChild(img);
            resolve();
        };

        reader.onerror = function (error) {
            reject(error);
        };

        reader.readAsDataURL(file);
    });
}

// Event listener for the image upload input
imageUpload.addEventListener("change", async (event) => {
    try {
        const file = event.target.files[0];
        
        if (validateFile(file)) {
            imagePreview.innerHTML = "<p>Processing your image...</p>";
            await displayImage(file);
        } else {
            // Clear the file input if validation fails
            imageUpload.value = '';
            imagePreview.innerHTML = "<p>No valid image uploaded. Please try again.</p>";
        }
    } catch (error) {
        console.error("An unexpected error occurred during file processing", error);
        showFeedback("An unexpected error occurred. Please try again.", true);
        imagePreview.innerHTML = "<p>Error processing image. Please try again.</p>";
        // Clear the file input if an error occurs
        imageUpload.value = '';
    }
});