// Dedicated local host for browser tests; requires the sibling meme-police install.
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const port = Number(process.env.PORT || 3002);
const origin = process.env.ORIGIN || `http://localhost:${port}`;
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), "citadels-ui-host-"));
process.chdir(appDir);
const requireFromHost = require("node:module").createRequire(path.resolve(__dirname, "../../meme-police/package.json"));
const Server = requireFromHost("ws-server-engine");
const server = new Server("ui-test-local-key", {
    port, origin, appDir, timeZoneOffset: 3,
    rateLimit: {time: 1, amount: 100, blockDuration: 1},
    maxConnections: 20, maxRoomsPerIP: 10, maxUsersPerRoom: 25,
    maxPayload: 10000, dumpInterval: null, pingInterval: 900000,
    // Fresh browser profiles may load shared CDN scripts longer than the default 15s token TTL.
    sessionTTL: 60000, inactivityTimeout: false, updatesVersion: 1
});
server.users.restoreManagedRooms().then(() => {
    require("../module")(server, "/bg/citadels", "");
    console.log(`UI tests: ${origin}/bg/citadels`);
}).catch(error => {console.error(error); process.exitCode = 1;});
