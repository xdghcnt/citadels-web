"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const setup = require("../public/setup");
const source = fs.readFileSync(require.resolve("../public/app.jsx"), "utf8");

// These class sections contain no JSX: run their real handlers without Babel or a browser.
function loadClass(name, firstExcludedMethod, globals = {}) {
    const start = source.indexOf("class " + name + " extends React.Component");
    const end = source.indexOf("    " + firstExcludedMethod + "(", start);
    assert.ok(start >= 0 && end > start, "Unable to find the frontend class section");
    class Component {
        constructor(props) { this.props = props; }
        setState(change) { this.state = Object.assign({}, this.state, change); }
    }
    const context = vm.createContext({React: {Component}, CitadelsSetup: setup, ...globals});
    vm.runInContext(source.slice(start, end) + "}\nglobalThis.TestClass = " + name, context);
    return context.TestClass;
}

function mountedGame() {
    const handlers = {};
    const socket = {on(event, handler) {handlers[event] = handler;}, emit() {}};
    const Game = loadClass("Game", "getSound", {
        localStorage: {}, document: {}, window: {socket},
        CommonRoom: {
            roomInit(game) {game.socket = socket; game.userId = "host"; return {roomId: "test"};},
            processCommonRoom() {}
        }
    });
    const game = new Game();
    game.state = {...game.state, phase: 0, userSlot: 0, currentPlayer: 0, hostId: "host",
        showCreateGamePanel: true, setupPending: false, setupError: "previous error", buildTarget: null};
    game.componentDidMount();
    return {game, handlers};
}

test("an externally started game closes the editor independently of the local start request", () => {
    for (const phase of [1, 1.5, 2, 3]) {
        for (const setupPending of [false, true]) {
            const {game, handlers} = mountedGame();
            game.state.setupPending = setupPending;
            handlers.state({phase, hostId: "host", currentPlayer: 0, playerSlots: ["host", "player"]});
            assert.equal(game.state.showCreateGamePanel, false);
            assert.equal(game.state.setupPending, false);
            assert.equal(game.state.setupError, null);
        }
    }
});

test("losing ownership closes the editor while ordinary lobby updates preserve it", () => {
    const {game, handlers} = mountedGame();
    handlers.state({phase: 0, hostId: "host", currentPlayer: 0, playerSlots: ["host", "player"]});
    assert.equal(game.state.showCreateGamePanel, true);
    handlers.state({phase: 0, hostId: "player", currentPlayer: 0, playerSlots: ["host", "player"]});
    assert.equal(game.state.showCreateGamePanel, false);
});

test("import and export refuse an active game, another host, gallery and an unmounted panel", () => {
    let reads = 0, exports = 0;
    const Panel = loadClass("CreateGamePanel", "renderStartingSettings", {
        FileReader: class {readAsText() {reads++;}},
        URL: {createObjectURL() {exports++;}}, Blob: class {}
    });
    for (const change of [{phase: 1}, {phase: 2}, {hostId: "other"}, {galleryMode: true}, {unmounted: true}]) {
        const props = {data: {phase: 0, userId: "host", hostId: "host", playerSlots: ["host", "player"], setupDraft: setup.getDefaultSetup()}, galleryMode: false};
        Object.assign(props.data, change);
        props.galleryMode = change.galleryMode === true;
        const panel = new Panel(props);
        panel.unmounted = change.unmounted === true;
        const before = JSON.stringify(panel.state);
        panel.handleImportSetup({target: {files: [{size: 1}], value: "test.json"}});
        panel.handleExportSetup();
        assert.equal(JSON.stringify(panel.state), before);
    }
    assert.equal(reads, 0);
    assert.equal(exports, 0);
});

test("a pending file read cannot apply its setup after the game starts or ownership changes", () => {
    const Panel = loadClass("CreateGamePanel", "renderStartingSettings", {
        FileReader: class {readAsText() {}},
    });
    for (const change of [{phase: 1}, {hostId: "other"}]) {
        const props = {data: {phase: 0, userId: "host", hostId: "host", playerSlots: ["host", "player"], setupDraft: setup.getDefaultSetup()}};
        const panel = new Panel(props);
        panel.handleImportSetup({target: {files: [{size: 1}], value: "test.json"}});
        assert.equal(panel.state.importPending, true);
        const nextSetup = setup.getDefaultSetup(); nextSetup.starting.gold = 19;
        panel.importReader.result = setup.serializeSetup(nextSetup);
        Object.assign(props.data, change);
        panel.importReader.onload();
        assert.equal(panel.state.starting.gold, 2);
    }
});
