// js/description.js
const DESCRIPTION_API = "/api/description/";

export async function loadDescription(id) {
    const container = document.getElementById("description-Container");
    container.innerHTML = "";
    const descUrl = `${DESCRIPTION_API}?boneId=${encodeURIComponent(id)}`;

    try {
        const response = await fetch(descUrl);
        const data = await response.text();
        container.innerHTML = data;

        const nameItem = document.createElement("li");
        nameItem.innerHTML = `<strong>${data.name}</strong>`;
        container.appendChild(nameItem);

        data.description.forEach(point => {
            const li = document.createElement("li");
            li.textContent = point;
            container.appendChild(li);
        });
    } catch (error) {
        container.innerHTML = "<li>Error loading description.</li>";
        console.error("Failed to fetch description:", error);
    }
}
