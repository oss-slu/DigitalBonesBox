const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { Buffer } = require("buffer"); // explicit: Jest's jsdom environment has no global Buffer
const express = require("express");
const request = require("supertest");
const {
    createScenesRouter,
    createFileSceneStore,
    createRedisSceneStore,
    resolveSceneStore,
    SceneLockTimeoutError,
    RELEASE_LOCK_SCRIPT,
    SCENE_LOCK_TTL_MS,
    MAX_IMAGE_SRC_LENGTH,
    MAX_SCENE_OBJECTS,
    MAX_IMPORT_LOG_ENTRIES,
} = require("./scenes");

function validImage(overrides = {}) {
    return {
        id: crypto.randomUUID(),
        src: "data:image/png;base64,AAAA",
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        ...overrides,
    };
}

// Widens the read-save race window deterministically so a concurrency test
// doesn't depend on machine speed or backend internals (PR #493 review).
function withArtificialDelay(store, ms) {
    return {
        ...store,
        async get(sceneId) {
            const result = await store.get(sceneId);
            await new Promise((resolve) => setTimeout(resolve, ms));
            return result;
        },
        async save(scene) {
            await new Promise((resolve) => setTimeout(resolve, ms));
            return store.save(scene);
        },
    };
}

// In-memory stand-in for the subset of the @upstash/redis client the store uses.
// Values round-trip through JSON like the real client's automatic serialization.
// `px` expiry is honored against `now()`, which tests can replace with a fake
// clock to expire a lock without waiting. `eval` runs only the store's own
// lock-release script, and runs it in one synchronous step - the same
// atomicity guarantee Redis gives a Lua script.
function createFakeRedis({ now = () => Date.now() } = {}) {
    const strings = new Map();
    const expiries = new Map();
    const sets = new Map();
    const has = (key) => {
        if (expiries.has(key) && expiries.get(key) <= now()) {
            strings.delete(key);
            expiries.delete(key);
        }
        return strings.has(key);
    };
    const read = (key) => (has(key) ? JSON.parse(strings.get(key)) : null);
    return {
        async get(key) {
            return read(key);
        },
        async mget(...keys) {
            return keys.map(read);
        },
        async set(key, value, options = {}) {
            if (options.nx && has(key)) return null;
            strings.set(key, JSON.stringify(value));
            if (options.px) expiries.set(key, now() + options.px);
            else expiries.delete(key);
            return "OK";
        },
        async del(key) {
            expiries.delete(key);
            return has(key) && strings.delete(key) ? 1 : 0;
        },
        async eval(script, keys, args) {
            if (script !== RELEASE_LOCK_SCRIPT) throw new Error("Unexpected script");
            const [key] = keys;
            if (read(key) !== args[0]) return 0;
            strings.delete(key);
            expiries.delete(key);
            return 1;
        },
        async sadd(key, member) {
            if (!sets.has(key)) sets.set(key, new Set());
            sets.get(key).add(member);
            return 1;
        },
        async srem(key, member) {
            return sets.has(key) && sets.get(key).delete(member) ? 1 : 0;
        },
        async smembers(key) {
            return [...(sets.get(key) || [])];
        },
    };
}

function buildApp(store) {
    const app = express();
    // Matches server.js's real limit (Issue #412) so tests near the image size
    // cap are rejected by the route's own validation, not Express's raw limit.
    app.use(express.json({ limit: "6mb" }));
    app.use("/api/scenes", createScenesRouter(store));
    return app;
}

const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

const backends = [
    {
        name: "file store",
        setup() {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bonebox-scenes-test-"));
            return {
                newStore: () => createFileSceneStore(dir),
                cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
            };
        },
    },
    {
        name: "redis store",
        setup() {
            const redis = createFakeRedis();
            return {
                newStore: () => createRedisSceneStore(redis),
                cleanup: () => {},
            };
        },
    },
];

describe.each(backends)("Scenes API ($name)", (backend) => {
    let env;
    let app;

    beforeEach(() => {
        env = backend.setup();
        app = buildApp(env.newStore());
    });

    afterEach(() => {
        env.cleanup();
    });

    const createScene = (body = {}) => request(app).post("/api/scenes").send(body);

    // Issue #421: Create a New Scene
    describe("POST /api/scenes - Issue 421", () => {
        it("creates a blank scene with a unique id", async () => {
            const first = await createScene();
            const second = await createScene();

            expect(first.statusCode).toBe(201);
            expect(second.statusCode).toBe(201);
            expect(first.body.id).not.toBe(second.body.id);
            expect(first.body.images).toEqual([]);
            expect(first.body.annotations).toEqual([]);
            expect(first.headers.location).toBe(`/api/scenes/${first.body.id}`);
        });

        it("assigns numbered default names when none is given", async () => {
            const first = await createScene();
            const second = await createScene();

            expect(first.body.name).toBe("Untitled Scene");
            expect(second.body.name).toBe("Untitled Scene 2");
        });

        it("accepts a custom name and rejects duplicates", async () => {
            const created = await createScene({ name: "  Pelvis Left  " });
            expect(created.body.name).toBe("Pelvis Left");

            const dup = await createScene({ name: "pelvis left" });
            expect(dup.statusCode).toBe(409);
        });

        it("rejects an empty name", async () => {
            const response = await createScene({ name: "   " });
            expect(response.statusCode).toBe(400);
        });
    });

    // Issue #422: Open an Existing Scene
    describe("GET /api/scenes and /api/scenes/:sceneId - Issue 422", () => {
        it("lists saved scenes", async () => {
            const created = await createScene({ name: "Skull" });
            const response = await request(app).get("/api/scenes");

            expect(response.statusCode).toBe(200);
            expect(response.body.scenes).toHaveLength(1);
            expect(response.body.scenes[0]).toMatchObject({
                id: created.body.id,
                name: "Skull",
                imageCount: 0,
                annotationCount: 0,
            });
        });

        it("opens a stored scene without losing object positions or styles", async () => {
            const created = await createScene({ name: "Bony Pelvis" });
            const stored = {
                ...created.body,
                images: [{ id: "img1", src: "/api/images/ilium.png", x: 10, y: 20, width: 300, height: 400, rotation: 15, flipX: true }],
                annotations: [{ id: "a1", type: "polygon", points: [[0, 0], [1, 0], [1, 1]], fill: "#ff000055" }],
            };
            await env.newStore().save(stored);

            const reopened = await request(buildApp(env.newStore())).get(`/api/scenes/${created.body.id}`);
            expect(reopened.statusCode).toBe(200);
            expect(reopened.body).toEqual(stored);
        });

        it("returns 404 for an unknown scene", async () => {
            const response = await request(app).get(`/api/scenes/${UNKNOWN_ID}`);
            expect(response.statusCode).toBe(404);
        });

        it("returns 400 for a malformed scene id", async () => {
            const response = await request(app).get("/api/scenes/..%2F..%2Fserver");
            expect(response.statusCode).toBe(400);
        });
    });

    // Issue #423: Manage Scene Names
    describe("PATCH /api/scenes/:sceneId - Issue 423", () => {
        it("renames a scene and the new name shows in the list", async () => {
            const created = await createScene();
            const renamed = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ name: "Thorax Anterior" });

            expect(renamed.statusCode).toBe(200);
            expect(renamed.body.name).toBe("Thorax Anterior");

            const list = await request(app).get("/api/scenes");
            expect(list.body.scenes[0].name).toBe("Thorax Anterior");
        });

        it("rejects empty and duplicate names", async () => {
            const a = await createScene({ name: "A" });
            await createScene({ name: "B" });

            const empty = await request(app).patch(`/api/scenes/${a.body.id}`).send({ name: "" });
            expect(empty.statusCode).toBe(400);

            const dup = await request(app).patch(`/api/scenes/${a.body.id}`).send({ name: "b" });
            expect(dup.statusCode).toBe(409);
        });

        it("allows re-saving a scene with its own name", async () => {
            const a = await createScene({ name: "A" });
            const response = await request(app).patch(`/api/scenes/${a.body.id}`).send({ name: "A" });
            expect(response.statusCode).toBe(200);
        });

        it("returns 404 when renaming an unknown scene", async () => {
            const response = await request(app)
                .patch(`/api/scenes/${UNKNOWN_ID}`)
                .send({ name: "Nope" });
            expect(response.statusCode).toBe(404);
        });
    });

    // Issue #412: Upload and Store an Imported Image
    describe("PATCH /api/scenes/:sceneId with an image - Issue 412", () => {
        it("adds a newly imported image to the scene", async () => {
            const created = await createScene();
            const image = validImage();

            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ image });

            expect(response.statusCode).toBe(200);
            expect(response.body.images).toEqual([image]);
        });

        it("keeps the image after the scene is reloaded", async () => {
            const created = await createScene();
            const image = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image });

            const reloaded = await request(app).get(`/api/scenes/${created.body.id}`);

            expect(reloaded.statusCode).toBe(200);
            expect(reloaded.body.images).toEqual([image]);
        });

        it("does not create a duplicate record when the same image id is saved twice", async () => {
            const created = await createScene();
            const image = validImage();

            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image });
            const second = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ image });

            expect(second.statusCode).toBe(200);
            expect(second.body.images).toHaveLength(1);
        });

        it("keeps existing images when a different image is added", async () => {
            const created = await createScene();
            const first = validImage();
            const second = validImage();

            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: first });
            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ image: second });

            expect(response.body.images).toEqual([first, second]);
        });

        it("rejects an image whose src is not a data:image/ URL", async () => {
            const created = await createScene();
            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ image: validImage({ src: "https://example.com/x.png" }) });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toMatch(/data:image/);
        });

        it("rejects an image whose src exceeds the size cap", async () => {
            const created = await createScene();
            const oversizedSrc = `data:image/png;base64,${"A".repeat(MAX_IMAGE_SRC_LENGTH + 1)}`;
            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ image: validImage({ src: oversizedSrc }) });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toMatch(/too large/i);
        });

        it("rejects an image with non-numeric position or size fields", async () => {
            const created = await createScene();
            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ image: validImage({ width: "big" }) });

            expect(response.statusCode).toBe(400);
        });

        it("rejects an image with a width of 0", async () => {
            const created = await createScene();
            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ image: validImage({ width: 0 }) });

            expect(response.statusCode).toBe(400);
        });

        it("returns 404 when adding an image to an unknown scene", async () => {
            const response = await request(app)
                .patch(`/api/scenes/${UNKNOWN_ID}`)
                .send({ image: validImage() });

            expect(response.statusCode).toBe(404);
        });

        it("returns 400 when the body has neither name nor image", async () => {
            const created = await createScene();
            const response = await request(app).patch(`/api/scenes/${created.body.id}`).send({});
            expect(response.statusCode).toBe(400);
        });

        it("can rename and add an image in the same request", async () => {
            const created = await createScene();
            const image = validImage();

            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ name: "Renamed", image });

            expect(response.statusCode).toBe(200);
            expect(response.body.name).toBe("Renamed");
            expect(response.body.images).toEqual([image]);
        });

        // PR #493 review: a scene can have multiple images that each pass the
        // per-image cap yet together exceed Vercel's 4.5MB request/response cap.
        it("rejects an image that would push the scene over its total image size budget", async () => {
            const created = await createScene();
            const first = validImage({ src: `data:image/png;base64,${"A".repeat(MAX_IMAGE_SRC_LENGTH - 100)}` });
            const firstResponse = await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: first });
            expect(firstResponse.statusCode).toBe(200);

            const second = validImage({ src: `data:image/png;base64,${"A".repeat(MAX_IMAGE_SRC_LENGTH - 100)}` });
            const response = await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: second });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toMatch(/size limit/i);

            const reloaded = await request(app).get(`/api/scenes/${created.body.id}`);
            expect(reloaded.body.images).toEqual([first]);
        });
    });

    // PR #493 review: a rename and an image save racing each other must not
    // clobber one another. An artificial delay widens the read-save window so
    // this reproduces deterministically instead of depending on real timing.
    describe("PATCH /api/scenes/:sceneId concurrency - PR #493 review", () => {
        it("does not lose a concurrent rename or image save", async () => {
            const slowApp = buildApp(withArtificialDelay(env.newStore(), 30));
            const created = await request(slowApp).post("/api/scenes").send({});
            const image = validImage();

            const [renameResponse, imageResponse] = await Promise.all([
                request(slowApp).patch(`/api/scenes/${created.body.id}`).send({ name: "Renamed" }),
                request(slowApp).patch(`/api/scenes/${created.body.id}`).send({ image }),
            ]);

            expect(renameResponse.statusCode).toBe(200);
            expect(imageResponse.statusCode).toBe(200);

            const final = await request(slowApp).get(`/api/scenes/${created.body.id}`);
            expect(final.body.name).toBe("Renamed");
            expect(final.body.images).toEqual([image]);
        });

        // Issue #451: a bone-image import (Issue #466) only builds content for
        // the client's working copy, so it never reads, locks, or writes the
        // stored scene and can't race a save at all.
        it("imports a bone's images without touching the stored scene", async () => {
            const contentDir = fs.mkdtempSync(path.join(os.tmpdir(), "bonebox-legacy-content-"));
            try {
                const descriptionsDir = path.join(contentDir, "descriptions");
                const imagesDir = path.join(contentDir, "images");
                fs.mkdirSync(descriptionsDir);
                fs.mkdirSync(imagesDir);
                fs.writeFileSync(
                    path.join(descriptionsDir, "fixture_bone_description.json"),
                    JSON.stringify({ name: "Fixture Bone", images: ["fixture_bone_1.png"] })
                );
                // Minimal PNG header: enough for the image catalog to read width and height.
                const png = Buffer.alloc(33);
                png.writeUInt32BE(0x89504e47, 0);
                png.writeUInt32BE(0x0d0a1a0a, 4);
                png.writeUInt32BE(13, 8);
                png.write("IHDR", 12, "ascii");
                png.writeUInt32BE(200, 16);
                png.writeUInt32BE(100, 20);
                fs.writeFileSync(path.join(imagesDir, "fixture_bone_1.png"), png);

                const store = env.newStore();
                const created = await request(buildApp(store)).post("/api/scenes").send({});
                await request(buildApp(store)).patch(`/api/scenes/${created.body.id}`).send({ image: validImage() });
                const before = (await request(buildApp(store)).get(`/api/scenes/${created.body.id}`)).body;

                const touched = [];
                const watchedStore = { ...store };
                for (const method of ["get", "list", "save", "remove", "withLock"]) {
                    watchedStore[method] = (...args) => {
                        touched.push(method);
                        return store[method](...args);
                    };
                }
                const importApp = express();
                importApp.use(express.json({ limit: "6mb" }));
                importApp.use("/api/scenes", createScenesRouter(watchedStore, {
                    legacyContent: { descriptionsDir, imagesDir },
                }));

                const response = await request(importApp)
                    .post(`/api/scenes/${created.body.id}/import-legacy`)
                    .send({ boneId: "fixture_bone", originY: 120 });

                expect(response.statusCode).toBe(200);
                expect(response.body.images).toHaveLength(1);
                expect(response.body.images[0]).toMatchObject({ y: 120, source: { filename: "fixture_bone_1.png" } });
                expect(response.body.importLogEntry).toMatchObject({ boneId: "fixture_bone", images: 1 });
                expect(touched).toEqual([]);

                const after = (await request(buildApp(store)).get(`/api/scenes/${created.body.id}`)).body;
                expect(after).toEqual(before);
            } finally {
                fs.rmSync(contentDir, { recursive: true, force: true });
            }
        });
    });

    // Issues #413-417: Position, Resize, Rotate, Flip, Crop an Image
    describe("PATCH /api/scenes/:sceneId with updateImage - Issues 413-417", () => {
        async function createSceneWithImage(overrides = {}) {
            const created = await createScene();
            const image = validImage(overrides);
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image });
            return { sceneId: created.body.id, image };
        }

        it("updates position and size (Issues 413, 414)", async () => {
            const { sceneId, image } = await createSceneWithImage();

            const response = await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, x: 40, y: 60, width: 200, height: 100 } });

            expect(response.statusCode).toBe(200);
            expect(response.body.images[0]).toMatchObject({ x: 40, y: 60, width: 200, height: 100 });
        });

        it("updates rotation (Issue 415)", async () => {
            const { sceneId, image } = await createSceneWithImage();

            const response = await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, rotation: 90 } });

            expect(response.statusCode).toBe(200);
            expect(response.body.images[0].rotation).toBe(90);
        });

        it("updates flipX/flipY (Issue 416)", async () => {
            const { sceneId, image } = await createSceneWithImage();

            const response = await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, flipX: true, flipY: true } });

            expect(response.statusCode).toBe(200);
            expect(response.body.images[0]).toMatchObject({ flipX: true, flipY: true });
        });

        it("sets a crop rect that fits within the image (Issue 417)", async () => {
            const { sceneId, image } = await createSceneWithImage({ width: 100, height: 50 });

            const response = await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, cropX: 10, cropY: 5, cropWidth: 50, cropHeight: 25 } });

            expect(response.statusCode).toBe(200);
            expect(response.body.images[0]).toMatchObject({ cropX: 10, cropY: 5, cropWidth: 50, cropHeight: 25 });
        });

        it("rejects a crop rect that doesn't fit within the image", async () => {
            const { sceneId, image } = await createSceneWithImage({ width: 100, height: 50 });

            const response = await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, cropX: 60, cropY: 0, cropWidth: 50, cropHeight: 25 } });

            expect(response.statusCode).toBe(400);
            expect(response.body.error).toMatch(/fit within the image/i);
        });

        it("rejects an incomplete crop rect (all four fields required together)", async () => {
            const { sceneId, image } = await createSceneWithImage();

            const response = await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, cropX: 10, cropY: 5, cropWidth: 20 } });

            expect(response.statusCode).toBe(400);
        });

        it("validates crop against a width/height changing in the same request", async () => {
            const { sceneId, image } = await createSceneWithImage({ width: 100, height: 50 });

            const response = await request(app).patch(`/api/scenes/${sceneId}`).send({
                updateImage: { id: image.id, width: 40, cropX: 0, cropY: 0, cropWidth: 50, cropHeight: 25 },
            });

            expect(response.statusCode).toBe(400);
        });

        it("rejects an unknown field", async () => {
            const { sceneId, image } = await createSceneWithImage();

            const response = await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, src: "data:image/png;base64,EVIL" } });

            expect(response.statusCode).toBe(400);
        });

        it("never lets updateImage change id or src", async () => {
            const { sceneId, image } = await createSceneWithImage();

            await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, x: 5 } });

            const reloaded = await request(app).get(`/api/scenes/${sceneId}`);
            expect(reloaded.body.images[0].id).toBe(image.id);
            expect(reloaded.body.images[0].src).toBe(image.src);
        });

        it("keeps updates after the scene is reloaded", async () => {
            const { sceneId, image } = await createSceneWithImage();
            await request(app)
                .patch(`/api/scenes/${sceneId}`)
                .send({ updateImage: { id: image.id, rotation: 45 } });

            const reloaded = await request(app).get(`/api/scenes/${sceneId}`);
            expect(reloaded.body.images[0].rotation).toBe(45);
        });

        it("returns 404 when updating an image that doesn't exist", async () => {
            const created = await createScene();
            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ updateImage: { id: crypto.randomUUID(), rotation: 10 } });

            expect(response.statusCode).toBe(404);
        });
    });

    // Issue #418: Remove an Image from a Scene
    describe("PATCH /api/scenes/:sceneId with removeImageId - Issue 418", () => {
        it("removes the requested image and leaves the others intact", async () => {
            const created = await createScene();
            const keep = validImage();
            const remove = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: keep });
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: remove });

            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ removeImageId: remove.id });

            expect(response.statusCode).toBe(200);
            expect(response.body.images).toEqual([keep]);
        });

        it("keeps the removal after the scene is reloaded", async () => {
            const created = await createScene();
            const image = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image });
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ removeImageId: image.id });

            const reloaded = await request(app).get(`/api/scenes/${created.body.id}`);
            expect(reloaded.body.images).toEqual([]);
        });

        it("is a no-op success when the image is already gone (safe to retry)", async () => {
            const created = await createScene();
            const image = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image });
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ removeImageId: image.id });

            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ removeImageId: image.id });

            expect(response.statusCode).toBe(200);
            expect(response.body.images).toEqual([]);
        });

        it("returns 404 when removing from an unknown scene", async () => {
            const response = await request(app)
                .patch(`/api/scenes/${UNKNOWN_ID}`)
                .send({ removeImageId: crypto.randomUUID() });

            expect(response.statusCode).toBe(404);
        });
    });

    // Issue #419: Reorder Image Layers
    describe("PATCH /api/scenes/:sceneId with reorderImageIds - Issue 419", () => {
        it("reorders images to match the given id order", async () => {
            const created = await createScene();
            const first = validImage();
            const second = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: first });
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: second });

            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ reorderImageIds: [second.id, first.id] });

            expect(response.statusCode).toBe(200);
            expect(response.body.images).toEqual([second, first]);
        });

        it("keeps the new order after the scene is reloaded", async () => {
            const created = await createScene();
            const first = validImage();
            const second = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: first });
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: second });
            await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ reorderImageIds: [second.id, first.id] });

            const reloaded = await request(app).get(`/api/scenes/${created.body.id}`);
            expect(reloaded.body.images.map((img) => img.id)).toEqual([second.id, first.id]);
        });

        it("rejects an order that drops an existing image", async () => {
            const created = await createScene();
            const first = validImage();
            const second = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: first });
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: second });

            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ reorderImageIds: [first.id] });

            expect(response.statusCode).toBe(400);

            const reloaded = await request(app).get(`/api/scenes/${created.body.id}`);
            expect(reloaded.body.images).toEqual([first, second]);
        });

        it("rejects an order that includes an id not on the scene", async () => {
            const created = await createScene();
            const first = validImage();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ image: first });

            const response = await request(app)
                .patch(`/api/scenes/${created.body.id}`)
                .send({ reorderImageIds: [first.id, crypto.randomUUID()] });

            expect(response.statusCode).toBe(400);
        });
    });

    // Issue #424: Delete a Scene
    describe("DELETE /api/scenes/:sceneId - Issue 424", () => {
        it("deletes only the requested scene", async () => {
            const keep = await createScene({ name: "Keep" });
            const remove = await createScene({ name: "Remove" });

            const response = await request(app).delete(`/api/scenes/${remove.body.id}`);
            expect(response.statusCode).toBe(204);

            const list = await request(app).get("/api/scenes");
            expect(list.body.scenes.map((s) => s.id)).toEqual([keep.body.id]);
        });

        it("returns 404 when deleting an unknown scene", async () => {
            const response = await request(app).delete(`/api/scenes/${UNKNOWN_ID}`);
            expect(response.statusCode).toBe(404);
        });

        // A save that already read the scene must not write it back after a
        // delete from another tab or client, bringing the scene back.
        it("is not undone by a save that was already in progress", async () => {
            const slowApp = buildApp(withArtificialDelay(env.newStore(), 60));
            const created = await request(slowApp).post("/api/scenes").send({});
            const id = created.body.id;

            // supertest only sends once the request is awaited or then()'d.
            const save = request(slowApp).put(`/api/scenes/${id}`)
                .send({ images: [validImage()], annotations: [] })
                .then((response) => response);
            await new Promise((resolve) => setTimeout(resolve, 20));
            const deleted = await request(slowApp).delete(`/api/scenes/${id}`);

            expect((await save).statusCode).toBe(200);
            expect(deleted.statusCode).toBe(204);
            expect((await request(slowApp).get(`/api/scenes/${id}`)).statusCode).toBe(404);
        });
    });

    // Issues #451-454: saving a scene's whole working copy in one request.
    describe("PUT /api/scenes/:sceneId - Issues 451-454", () => {
        const complexContent = () => ({
            images: [
                { ...validImage({ id: "img-a" }), rotation: 15, flipX: true, cropX: 0, cropY: 0, cropWidth: 50, cropHeight: 25 },
                {
                    id: "img-b", src: "/api/images/ilium_image1.jpg", x: 0, y: 300, width: 235, height: 371, rotation: 0,
                    source: { type: "legacy-image", boneId: "ilium", filename: "ilium_image1.jpg" },
                },
            ],
            annotations: [
                { id: "a1", type: "polygon", points: [[0, 0], [1, 0], [1, 1]], fill: "#ff000055" },
                {
                    id: "a2", type: "text", text: "Ilium", x: 5, y: 6,
                    sourceImageId: "img-b", sourceImageFrame: { x: 0, y: 300, width: 235, height: 371 },
                },
            ],
            importLog: [{ at: "2026-10-12T00:00:00.000Z", boneId: "ilium", images: 1, warnings: [] }],
        });
        const save = (id, body) => request(app).put(`/api/scenes/${id}`).send(body);

        it("stores the whole working copy exactly, and a fresh store loads it back", async () => {
            const created = await createScene({ name: "Round Trip" });
            const content = complexContent();

            const response = await save(created.body.id, { ...content, baseUpdatedAt: created.body.updatedAt });
            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchObject({ ...content, id: created.body.id, name: "Round Trip" });
            expect(response.body.createdAt).toBe(created.body.createdAt);

            const reloaded = await request(buildApp(env.newStore())).get(`/api/scenes/${created.body.id}`);
            expect(reloaded.body).toEqual(response.body);
        });

        it("replaces the arrays rather than merging them, and keeps the import log unless one is sent", async () => {
            const created = await createScene();
            await save(created.body.id, complexContent());

            const response = await save(created.body.id, { images: [], annotations: [{ id: "only", type: "text", text: "x", x: 0, y: 0 }] });
            expect(response.body.images).toEqual([]);
            expect(response.body.annotations.map((a) => a.id)).toEqual(["only"]);
            expect(response.body.importLog).toEqual(complexContent().importLog);
        });

        it("keeps only the most recent import log entries", async () => {
            const created = await createScene();
            const importLog = Array.from({ length: MAX_IMPORT_LOG_ENTRIES + 5 }, (_, i) => ({ boneId: `bone_${i}` }));

            const response = await save(created.body.id, { images: [], annotations: [], importLog });
            expect(response.body.importLog).toHaveLength(MAX_IMPORT_LOG_ENTRIES);
            expect(response.body.importLog[0].boneId).toBe("bone_5");
        });

        it("updates the list's counts", async () => {
            const created = await createScene();
            await save(created.body.id, complexContent());

            const list = await request(app).get("/api/scenes");
            expect(list.body.scenes[0]).toMatchObject({ imageCount: 2, annotationCount: 2 });
        });

        it("doesn't affect other scenes", async () => {
            const a = await createScene({ name: "A" });
            const b = await createScene({ name: "B" });
            await save(a.body.id, complexContent());

            const reloaded = await request(app).get(`/api/scenes/${b.body.id}`);
            expect(reloaded.body).toEqual(b.body);
        });

        it("refuses a save from a stale copy with 412 and the current version", async () => {
            const created = await createScene();
            const first = await save(created.body.id, { images: [], annotations: [], baseUpdatedAt: created.body.updatedAt });
            expect(first.statusCode).toBe(200);

            const stale = await save(created.body.id, { ...complexContent(), baseUpdatedAt: created.body.updatedAt });
            expect(stale.statusCode).toBe(412);
            expect(stale.body.updatedAt).toBe(first.body.updatedAt);
            expect((await request(app).get(`/api/scenes/${created.body.id}`)).body.images).toEqual([]);

            const current = await save(created.body.id, { ...complexContent(), baseUpdatedAt: first.body.updatedAt });
            expect(current.statusCode).toBe(200);
        });

        it("treats a rename as a new version too", async () => {
            const created = await createScene();
            await request(app).patch(`/api/scenes/${created.body.id}`).send({ name: "Renamed elsewhere" });

            const stale = await save(created.body.id, { images: [], annotations: [], baseUpdatedAt: created.body.updatedAt });
            expect(stale.statusCode).toBe(412);
        });

        it("gives back-to-back writes in the same millisecond different versions", async () => {
            const created = await createScene();
            const frozen = Date.parse(created.body.updatedAt) + 1000;
            const spy = jest.spyOn(Date, "now").mockReturnValue(frozen);
            try {
                const first = await save(created.body.id, { images: [], annotations: [] });
                const second = await save(created.body.id, { images: [], annotations: [] });
                expect(Date.parse(second.body.updatedAt)).toBeGreaterThan(Date.parse(first.body.updatedAt));

                const stale = await save(created.body.id, { images: [], annotations: [], baseUpdatedAt: first.body.updatedAt });
                expect(stale.statusCode).toBe(412);
            } finally {
                spy.mockRestore();
            }
        });

        it("overwrites without a version check when baseUpdatedAt is omitted", async () => {
            const created = await createScene();
            await save(created.body.id, complexContent());
            const response = await save(created.body.id, { images: [], annotations: [] });
            expect(response.statusCode).toBe(200);
        });

        it("can rename in the same save, refusing a taken name", async () => {
            await createScene({ name: "Taken" });
            const created = await createScene({ name: "Original" });

            const taken = await save(created.body.id, { images: [], annotations: [], name: "taken" });
            expect(taken.statusCode).toBe(409);
            expect((await save(created.body.id, { images: [], annotations: [], name: "  " })).statusCode).toBe(400);

            const renamed = await save(created.body.id, { images: [], annotations: [], name: " New name " });
            expect(renamed.body.name).toBe("New name");
        });

        it("returns 404 for an unknown scene and 400 for a malformed id", async () => {
            expect((await save(UNKNOWN_ID, { images: [], annotations: [] })).statusCode).toBe(404);
            expect((await save("not-an-id", { images: [], annotations: [] })).statusCode).toBe(400);
        });

        it.each([
            ["no arrays", {}],
            ["images missing", { annotations: [] }],
            ["annotations missing", { images: [] }],
            ["images not an array", { images: {}, annotations: [] }],
            ["an image that isn't an object", { images: ["x"], annotations: [] }],
            ["a blob: src", { images: [validImage({ src: "blob:http://x/1" })], annotations: [] }],
            ["a javascript: src", { images: [validImage({ src: "javascript:alert(1)" })], annotations: [] }],
            ["a protocol-relative src", { images: [validImage({ src: "//evil.example/x.png" })], annotations: [] }],
            ["a non-numeric size", { images: [validImage({ width: "big" })], annotations: [] }],
            ["a zero size", { images: [validImage({ height: 0 })], annotations: [] }],
            ["a crop outside the image", { images: [validImage({ cropX: 90, cropY: 0, cropWidth: 50, cropHeight: 10 })], annotations: [] }],
            ["a non-boolean flip", { images: [validImage({ flipX: "yes" })], annotations: [] }],
            ["an annotation that isn't an object", { images: [], annotations: [null] }],
            ["an import log that isn't a list", { images: [], annotations: [], importLog: {} }],
            ["an import log entry that isn't an object", { images: [], annotations: [], importLog: ["x"] }],
            ["a non-string baseUpdatedAt", { images: [], annotations: [], baseUpdatedAt: 5 }],
        ])("rejects %s with 400 and stores nothing", async (_label, body) => {
            const created = await createScene();
            const response = await save(created.body.id, body);
            expect(response.statusCode).toBe(400);
            expect((await request(app).get(`/api/scenes/${created.body.id}`)).body).toEqual(created.body);
        });

        it("enforces the object count and image size limits", async () => {
            const created = await createScene();
            const many = Array.from({ length: MAX_SCENE_OBJECTS + 1 }, () => ({ type: "text", text: "x", x: 0, y: 0 }));
            expect((await save(created.body.id, { images: [], annotations: many })).statusCode).toBe(400);

            const tooBig = validImage({ src: `data:image/png;base64,${"A".repeat(MAX_IMAGE_SRC_LENGTH)}` });
            expect((await save(created.body.id, { images: [tooBig], annotations: [] })).statusCode).toBe(400);

            const big = () => validImage({ src: `data:image/png;base64,${"A".repeat(MAX_IMAGE_SRC_LENGTH - 100)}` });
            const total = await save(created.body.id, { images: [big(), big()], annotations: [] });
            expect(total.statusCode).toBe(400);
            expect(total.body.error).toMatch(/size limit/i);
        });

        it("doesn't lose a rename that races a save", async () => {
            const slowApp = buildApp(withArtificialDelay(env.newStore(), 30));
            const created = await request(slowApp).post("/api/scenes").send({});
            const image = validImage();

            const [renamed, saved] = await Promise.all([
                request(slowApp).patch(`/api/scenes/${created.body.id}`).send({ name: "Renamed" }),
                request(slowApp).put(`/api/scenes/${created.body.id}`).send({ images: [image], annotations: [] }),
            ]);

            expect(renamed.statusCode).toBe(200);
            expect(saved.statusCode).toBe(200);
            const final = await request(slowApp).get(`/api/scenes/${created.body.id}`);
            expect(final.body.name).toBe("Renamed");
            expect(final.body.images).toEqual([image]);
        });

        it("returns 423 (not 409) when the scene stays locked by another write", async () => {
            const created = await createScene();
            const busyApp = buildApp({
                ...env.newStore(),
                withLock: async () => {
                    throw new SceneLockTimeoutError("Scene is busy, try again");
                },
            });

            const saved = await request(busyApp).put(`/api/scenes/${created.body.id}`).send({ images: [], annotations: [] });
            const renamed = await request(busyApp).patch(`/api/scenes/${created.body.id}`).send({ name: "Busy" });
            expect(saved.statusCode).toBe(423);
            expect(renamed.statusCode).toBe(423);
        });
    });

    // Issue #456: a working copy whose scene was deleted elsewhere is saved as
    // a new scene in one request, so a failure can't leave an empty scene.
    describe("POST /api/scenes with content - Issue 456", () => {
        it("creates the scene with the given content", async () => {
            const content = {
                images: [validImage()],
                annotations: [{ id: "a", type: "text", text: "x", x: 0, y: 0 }],
                importLog: [{ boneId: "ilium" }],
            };
            const response = await createScene({ name: "Recovered", ...content });

            expect(response.statusCode).toBe(201);
            expect(response.body).toMatchObject({ name: "Recovered", ...content });
            const reloaded = await request(app).get(`/api/scenes/${response.body.id}`);
            expect(reloaded.body).toEqual(response.body);
        });

        it("rejects invalid content or a taken name without creating anything", async () => {
            await createScene({ name: "Taken" });

            expect((await createScene({ images: [validImage({ src: "blob:x" })] })).statusCode).toBe(400);
            expect((await createScene({ name: "Taken", images: [validImage()], annotations: [] })).statusCode).toBe(409);
            const list = await request(app).get("/api/scenes");
            expect(list.body.scenes.map((s) => s.name)).toEqual(["Taken"]);
        });
    });

    // Issue #455: Duplicate a Scene
    describe("POST /api/scenes/:sceneId/duplicate - Issue 455", () => {
        const duplicate = (id) => request(app).post(`/api/scenes/${id}/duplicate`);

        it("copies the saved content under a new id and a \"copy\" name", async () => {
            const created = await createScene({
                name: "Pelvis",
                images: [validImage()],
                annotations: [{ id: "a", type: "text", text: "x", x: 0, y: 0 }],
                importLog: [{ boneId: "ilium" }],
            });

            const response = await duplicate(created.body.id);
            expect(response.statusCode).toBe(201);
            expect(response.headers.location).toBe(`/api/scenes/${response.body.id}`);
            expect(response.body.id).not.toBe(created.body.id);
            expect(response.body.name).toBe("Pelvis copy");
            expect(response.body.images).toEqual(created.body.images);
            expect(response.body.annotations).toEqual(created.body.annotations);
            expect(response.body.importLog).toEqual(created.body.importLog);
        });

        it("numbers the copy if the name is taken and keeps it within the name limit", async () => {
            const created = await createScene({ name: "Pelvis" });
            await duplicate(created.body.id);
            expect((await duplicate(created.body.id)).body.name).toBe("Pelvis copy 2");

            const long = await createScene({ name: "L".repeat(100) });
            const copy = await duplicate(long.body.id);
            expect(copy.body.name.length).toBeLessThanOrEqual(100);
            expect(copy.body.name).toMatch(/ copy$/);
        });

        it("is independent of the original", async () => {
            const created = await createScene({ name: "Original", images: [validImage()] });
            const copy = await duplicate(created.body.id);

            await request(app).put(`/api/scenes/${copy.body.id}`).send({ images: [], annotations: [] });
            const original = await request(app).get(`/api/scenes/${created.body.id}`);
            expect(original.body.images).toEqual(created.body.images);
        });

        it("returns 404 for an unknown scene", async () => {
            expect((await duplicate(UNKNOWN_ID)).statusCode).toBe(404);
        });
    });
});

// CodeQL flagged the file store's path construction as taking uncontrolled
// data: this proves it now re-validates the id itself rather than trusting a
// caller, even though the route-level `router.param` check already blocks
// malformed ids from ever reaching the store in normal operation.
// Subomiadekunle's PR #493 review: releasing the lock with a separate GET and
// DEL could delete another request's lock if ours expired in between. Release
// is now one atomic compare-and-delete (RELEASE_LOCK_SCRIPT).
describe("createRedisSceneStore lock", () => {
    const SCENE_ID = "11111111-1111-4111-8111-111111111111";
    const LOCK_KEY = `bonebox:lock:${SCENE_ID}`;
    let clock;
    let redis;
    let store;

    beforeEach(() => {
        clock = 1_000_000;
        redis = createFakeRedis({ now: () => clock });
        store = createRedisSceneStore(redis);
    });

    it("releases the lock with a single atomic compare-and-delete, not GET then DEL", async () => {
        const evalSpy = jest.spyOn(redis, "eval");
        const getSpy = jest.spyOn(redis, "get");
        const delSpy = jest.spyOn(redis, "del");
        const token = await store.acquireLock(SCENE_ID);

        await store.releaseLock(SCENE_ID, token);

        expect(evalSpy).toHaveBeenCalledWith(RELEASE_LOCK_SCRIPT, [LOCK_KEY], [token]);
        expect(getSpy).not.toHaveBeenCalled();
        expect(delSpy).not.toHaveBeenCalled();
    });

    it("lets the owner release its own lock", async () => {
        const token = await store.acquireLock(SCENE_ID);
        expect(await redis.get(LOCK_KEY)).toBe(token);

        expect(await store.releaseLock(SCENE_ID, token)).toBe(true);
        expect(await redis.get(LOCK_KEY)).toBeNull();
    });

    it("does not release a lock held by a different token", async () => {
        const token = await store.acquireLock(SCENE_ID);

        expect(await store.releaseLock(SCENE_ID, "not-the-owner")).toBe(false);
        expect(await redis.get(LOCK_KEY)).toBe(token);
    });

    it("keeps the TTL so an expired lock can be acquired by another request", async () => {
        const first = await store.acquireLock(SCENE_ID);
        clock += SCENE_LOCK_TTL_MS + 1;

        const second = await store.acquireLock(SCENE_ID);

        expect(second).not.toBe(first);
        expect(await redis.get(LOCK_KEY)).toBe(second);
    });

    it("does not let the previous owner delete the replacement owner's lock", async () => {
        const first = await store.acquireLock(SCENE_ID);
        clock += SCENE_LOCK_TTL_MS + 1;
        const second = await store.acquireLock(SCENE_ID);

        expect(await store.releaseLock(SCENE_ID, first)).toBe(false);
        expect(await redis.get(LOCK_KEY)).toBe(second);
        expect(await store.releaseLock(SCENE_ID, second)).toBe(true);
        expect(await redis.get(LOCK_KEY)).toBeNull();
    });

    it("leaves a replacement owner's lock in place when a slow withLock finishes", async () => {
        let replacement = null;
        await store.withLock(SCENE_ID, async () => {
            // This holder runs past its TTL, and another request takes over.
            clock += SCENE_LOCK_TTL_MS + 1;
            replacement = await store.acquireLock(SCENE_ID);
        });

        expect(await redis.get(LOCK_KEY)).toBe(replacement);
    });

    it("still serializes concurrent withLock calls on the same scene", async () => {
        const order = [];
        const slow = (name) => async () => {
            order.push(`${name}:start`);
            await new Promise((resolve) => setTimeout(resolve, 20));
            order.push(`${name}:end`);
        };

        await Promise.all([store.withLock(SCENE_ID, slow("a")), store.withLock(SCENE_ID, slow("b"))]);

        expect(order).toEqual(["a:start", "a:end", "b:start", "b:end"]);
        expect(await redis.get(LOCK_KEY)).toBeNull();
    });
});

describe("createFileSceneStore path safety", () => {
    let dir;
    let store;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "bonebox-scenes-pathsafety-"));
        store = createFileSceneStore(dir);
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it("rejects a traversal attempt instead of reading outside the scenes directory", async () => {
        await expect(store.get("../../etc/passwd")).rejects.toThrow(/invalid sceneid/i);
        await expect(store.remove("../../etc/passwd")).rejects.toThrow(/invalid sceneid/i);
    });

    it("rejects saving a scene with a malformed id", async () => {
        await expect(store.save({ id: "../../evil", name: "x", images: [], annotations: [] }))
            .rejects.toThrow(/invalid sceneid/i);
    });
});

describe("resolveSceneStore", () => {
    it("refuses to store scenes on Vercel when Redis is not configured", async () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
        const app = buildApp(resolveSceneStore({ VERCEL: "1" }));
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("Scene storage is not configured"));
        consoleError.mockRestore();

        const list = await request(app).get("/api/scenes");
        expect(list.statusCode).toBe(503);

        const create = await request(app).post("/api/scenes").send({});
        expect(create.statusCode).toBe(503);
    });

    it("uses local files outside Vercel when Redis is not configured", async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bonebox-scenes-resolve-"));
        try {
            const app = buildApp(resolveSceneStore({ SCENES_DIR: dir }));
            const created = await request(app).post("/api/scenes").send({});
            expect(created.statusCode).toBe(201);
            expect(fs.existsSync(path.join(dir, `${created.body.id}.json`))).toBe(true);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
