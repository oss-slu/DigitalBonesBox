### DigitalBoneBox – Design Artifact Context

## Project Overview
DigitalBoneBox is a web-based study tool that enables anatomy students to view and explore high-quality bone images outside the lab. The system organizes data into hierarchical JSON files — Boneset → Bone → Subbone — each containing descriptions and image references. A Node.js + Express backend fetches these JSON files from a GitHub data branch, while the frontend (HTML, CSS, JavaScript, HTMX) renders the content interactively in the browser.

## Artifacts Created and Purpose

1. System Architecture Diagram – shows how the browser, backend server, and GitHub Raw Data branch communicate, clarifying the flow of requests and data between client, cache, and data source.

2. Component/Module Diagram – outlines key frontend files (boneset.html, main.js, sidebar.js, etc.) and backend modules (server.js, cache, data fetcher), helping contributors understand how the system’s parts interact.

3. Data Model (ER Diagram) – captures the hierarchical JSON structure linking bonesets, bones, and subbones, each with its own images and descriptions. This serves as documentation for content creators and developers adding new bonesets.

4. Cache Lifecycle Diagram – illustrates the new caching behavior (from Cold → Warming → Ready → Refreshing → Degraded) that replaces the inefficient N+1 data-fetching pattern.

5. API Map & Sequence Diagram – documents key endpoints (/bonesets, /bones/:id, /search, /images/:id) and how they use the cache and GitHub data branch.

6. User Flow Diagrams – show the current user experience (browsing images) and the intended next state (adding annotations in a future sprint).

## Key Decisions and Trade-offs

1. Data Source: Storing JSON and images on GitHub simplifies version control and collaboration but adds dependency on GitHub uptime and API limits.

2. Caching: The in-memory cache significantly improves performance but introduces the need for a refresh mechanism and memory management.

3. Frontend Simplicity: Using vanilla JS and HTMX keeps the stack lightweight, though future interactive features may benefit from modularization or frameworks.

## How Artifacts Inform Current and Future Development
These artifacts guide the ongoing refactor by showing where caching, data access, and UI interactions meet. They clarify how new bonesets can be added to the GitHub data structure and how future features (interactive annotations and Tutor Mode) will integrate. The diagrams also document the system’s evolution, helping onboard new contributors and maintain long-term consistency.

## Current vs. Intended State

Current: The server makes multiple GitHub fetches for each request, slowing searches and data loading.

Intended: The refactored backend builds a single, in-memory cache at startup, serving all user requests instantly and refreshing only as needed.

## Links to Design Files

Design Artifacts: Created in draw.io / diagrams.net
 – file: DigitalBoneBox_Design_Artifacts.drawio