// const GITHUB_BASE_URL = "https://raw.githubusercontent.com/oss-slu/DigitalBonesBox/data/DataPelvis/descriptions/";

// export async function loadDescription(id) {
//     const url = `${GITHUB_BASE_URL}${id}.json`;
//     const titleEl = document.getElementById("description-title");
//     const listEl = document.getElementById("description-list");

//     try {
//         const response = await fetch(url);
//         const data = await response.json();

//         titleEl.textContent = data.name || id;
//         listEl.innerHTML = "";

//         data.description.forEach(line => {
//             const li = document.createElement("li");
//             li.textContent = line;
//             listEl.appendChild(li);
//         });
//     } catch {
//         titleEl.textContent = "No description found.";
//         listEl.innerHTML = "";
//     }
// }
