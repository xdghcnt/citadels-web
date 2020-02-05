const
    express = require('express'),
    socketIo = require("socket.io"),
    utils = require('./utils'),
    port = 8000,
    app = express(),
    server = app.listen(port),
    io = socketIo(server);

app.use('/', express.static(`${__dirname}/public`));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/app.html');
});

class JSONSet extends Set {
    constructor(iterable) {
        super(iterable)
    }

    toJSON() {
        return [...this]
    }
}

const
    rooms = {},
    states = {},
    sockets = {};

console.log(`Server listening on port ${port}`);

io.on("connection", socket => {
    let room, user, state, players,
        send = (playerId, event, data) => {
            sockets[room.roomId][playerId].emit(event, data);
        },
        sendState = user => {
            const slot = room.playerSlots.indexOf(user);
            if (players[slot]) {
                send(user, "player-state", players[slot]);
            } else send(user, "player-state", {})
        },
        update = () => [...room.onlinePlayers].forEach(user => send(user, "state", room)),
        updateState = () => [...room.onlinePlayers].forEach(sendState),
        sendStateSlot = (slot) => sendState(room.playerSlots[slot]),
        getRandomPlayer = () => {
            const res = [];
            room.playerSlots.forEach((user, slot) => {
                if (user !== null)
                    res.push(slot);
            });
            return utils.shuffle(res)[0];
        },
        getNextPlayer = () => {
            let slot = room.currentPlayer;
            slot++;
            while (!players[slot]) {
                if (slot === 7)
                    slot = 0;
                else
                    slot++;
            }
            return slot;
        },
        startGame = () => {
            state.playersCount = room.playerSlots.filter((user) => user !== null).length;
            if (state.playersCount > 3) {
                room.teamsLocked = true;
                state.districtDeck = utils.createDeck();
                room.playerSlots.forEach((player, slot) => {
                    if (player != null) {
                        players[slot] = {
                            hand: state.districtDeck.splice(0, 4)
                        };
                        room.playerGold[slot] = 2;
                        room.playerHand[slot] = 4;
                        room.playerDistricts[slot] = [];
                        room.playerCharacter[slot] = null;
                        room.playerScore[slot] = 0;
                    } else
                        delete players[slot];
                });

                room.king = getRandomPlayer();
                room.ender = null;
                room.winnerPlayer = null;
                newRound();               
            }
        },
        newRound = () => {
            room.phase = 1;
            room.currentCharacter = 0;
            state.characterDeck = [1,2,3,4,5,6,7,8];
            room.characterFace = [];
           
            let discard = state.playersCount == 7 ? 0 : 6 - state.playersCount;
            while (room.characterFace.length < discard) {
                let rnd = Math.floor(Math.random() * state.characterDeck.length); 
                if (state.characterDeck[rnd] != 4)
                    room.characterFace.push(...state.characterDeck.splice(rnd,1));
            }
            room.characterFace.sort((a,b) => a - b);

            let rnd = Math.floor(Math.random() * state.characterDeck.length); 
            state.discarded = state.characterDeck.splice(rnd, 1);

            Object.keys(players).forEach(slot => {
                players[slot].character = null;
                room.playerCharacter[slot] = null;
            });
            state.characterRoles = {};

            room.assassined = null;
            room.robbed = null;
            room.currentPlayer = room.king;
            players[room.currentPlayer].choose = state.characterDeck;
            update();
            updateState();
        },
        nextChoose = () => {
            players[room.currentPlayer].action = null;
            players[room.currentPlayer].choose = null;
            sendStateSlot(room.currentPlayer);
            if (state.characterDeck.length > 1) {
                room.currentPlayer = getNextPlayer();
                players[room.currentPlayer].choose = state.characterDeck;
                update();
                sendStateSlot(room.currentPlayer);
            } else if (state.playersCount == 7 && state.discarded) {
                state.characterDeck.push(state.discarded).sort((a,b) => a-b);
                state.discarded = null;
                room.currentPlayer = getNextPlayer();
                players[room.currentPlayer].choose = state.characterDeck;
                update();
                sendStateSlot(room.currentPlayer);
            }
            else {
                room.phase = 2;
                nextCharacter();
                return;
            }            
        },
        nextCharacter = () => {
            room.currentCharacter++;
            if (room.currentCharacter > 8) return endRound();
            room.currentPlayer = state.characterRoles[room.currentCharacter];
            if (room.currentPlayer == undefined || room.assassined == room.currentCharacter) return nextCharacter();
            room.playerCharacter[room.currentPlayer] = room.currentCharacter;

            if (room.robbed == room.currentCharacter) {
                let gold = room.playerGold[room.currentPlayer];
                room.playerGold[room.currentPlayer] = 0;
                room.playerGold[state.characterRoles[2]] += gold;
            }

            room.buildDistincts = 1;
            room.tookResource = false;
            switch (room.currentCharacter) {
                case 4: case 5: case 6: case 8: room.incomeAction = true; break;
                default: room.incomeAction = false; break;
            }
            players[room.currentPlayer].action = null;
            switch (room.currentCharacter) {
                case 1: players[room.currentPlayer].action = 'assassin-action'; break;
                case 2: players[room.currentPlayer].action = 'thief-action'; break;
                case 3: players[room.currentPlayer].action = 'magician-action'; break;
                case 4: room.king = room.currentPlayer; break;
                case 6: room.playerGold[room.currentPlayer] += 1; break;
                case 7: 
                    room.playerHand[room.currentPlayer] += 2;
                    players[room.currentPlayer].hand.push(...state.districtDeck.splice(0, 2));
                    room.buildDistincts = 3;
                break;
                case 8: players[room.currentPlayer].action = 'warlord-action'; break;
            }

            update();
            sendStateSlot(room.currentPlayer);
        },
        endRound = () => {
            room.king = '4' in state.characterRoles ? state.characterRoles[4] : room.king;
            if (room.ender != null) return endGame();
            newRound();
        },
        endGame = () => {
            room.currentPlayer = null;
            Object.keys(players).forEach(slot => countPoints(slot));
            let maxPoints = 0;
            for (let i = 1; i <= 8; i++) {
                if (state.characterRoles[i])
                    if (room.playerScore[state.characterRoles[i]] >= maxPoints) {
                        maxPoints = room.playerScore[state.characterRoles[i]]
                        room.winnerPlayer = state.characterRoles[i];
                    }
            }
            room.phase = 0;
            update();
        },
        isComboCity = (slot) => {
            let type = room.playerDistricts[slot].map(card => utils.distincts[card].type);
            let types = new Set(type);
            if (types.size == 4 && include(slot, 18) && type.filter(type => type == 9).length > 1)
                return true;
            return types.size == 5;
        },
        countPoints = (slot) => {
            room.playerScore[slot] = room.playerDistricts[slot].map(card => utils.distincts[card].cost).reduce((a,b) => a + b, 0);
            room.playerScore[slot] += 3 * isComboCity(slot);
            if (room.ender == slot) room.playerScore[slot] += 2;
            if (room.playerDistricts[slot].length > 6) room.playerScore[slot] += 2;
    
            room.playerScore[slot] += 2 * include(slot, 27);
            room.playerScore[slot] += room.playerHand[slot] * include(slot, 24);
            room.playerScore[slot] += room.playerGold[slot] * include(slot, 25);
        },
        include = (slot, card) => room.playerDistricts[slot].includes(card);
        
    socket.on("init", args => {
        user = args.userId;
        if (!rooms[args.roomId]) {
            states[args.roomId] = {
                players: {},
                districtDeck: [],
                characterDeck: [], 
                characterRoles: {}
            };
            sockets[args.roomId] = {}; 
        }
        sockets[args.roomId][user] = socket;
        state = states[args.roomId];
        players = state.players;
        room = rooms[args.roomId] = rooms[args.roomId] || {
            inited: true,
            hostId: user,
            roomId: args.roomId,
            playerSlots: Array(7).fill(null),
            playerNames: {},
            onlinePlayers: new JSONSet(),
            spectators: new JSONSet(),
            teamsLocked: false,
            phase: 0,
            currentPlayer: null,
            currentCharacter: 0,

            playerGold: {},
            playerHand: {},
            playerDistricts: {},
            playerCharacter: {},
            playerScore: {}
        };
        if (!room.playerNames[user]) {
            room.spectators.add(user);
        }
        room.onlinePlayers.add(user);
        room.playerNames[user] = args.userName && args.userName.substr(0, 60);
        update();
        sendState(user);
    });

    socket.on('take-character', value => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 1 && slot == room.currentPlayer && ~state.characterDeck[value]) {
            let role = state.characterDeck.splice(value, 1)[0];
            players[slot].character = role;
            room.playerCharacter[slot] = 0;
            state.characterRoles[role] = slot;
            nextChoose();
        }
    })

    socket.on('take-resources', res => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 2 && slot == room.currentPlayer && !room.tookResource && ~['coins', 'card'].indexOf(res)) {
            if (res == 'coins') {
                room.tookResource = true;
                room.playerGold[slot] += 2;
            }
            else {
                if (!state.districtDeck.length) return;
                room.tookResource = true;
                players[slot].choose = state.districtDeck.splice(0, 2 + include(slot,20));
                room.phase = 3;
            }
            countPoints(slot);
            update();
            sendState(user);
        }
    });

    socket.on('take-card', card => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 3 && slot == room.currentPlayer && ~players[slot].choose[card]) {
            players[slot].hand.push(...players[slot].choose.splice(card, 1));
            state.districtDeck.push(...players[slot].choose.splice(0));
            room.playerHand[slot] += 1;
            room.tookResource = true;
            room.phase = 2;
            countPoints(slot);
            update();
            sendState(user);
        }
    });

    socket.on('take-income', () => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 2 && slot == room.currentPlayer && room.incomeAction) {
            room.incomeAction = false;
            let income = room.playerDistricts[slot].map(card => utils.distincts[card].type)
                            .filter(type => type == room.currentCharacter).length
                            + include(slot, 26);
            room.playerGold[slot] += income;
            countPoints(slot);
            update();
            sendState(user);
        }
    });

    socket.on('build', card => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 2 && slot == room.currentPlayer && room.buildDistincts && ~players[slot].hand[card]) {
            const building = players[slot].hand[card];
            if (include(slot, building) && !include(slot,22))
                return 'You already have this district in city.';
            const cost = utils.distincts[building].cost - include(slot, 23) * (utils.distincts[building].type == 9);
            if (room.playerGold[slot] < cost)
                return `You don't have enough coins (${room.playerGold[slot]}/${cost}).`
            room.buildDistincts -= 1;
            room.playerGold[slot] -= cost;
            room.playerDistricts[slot].push(...players[slot].hand.splice(card,1));
            room.playerHand[slot] -= 1;
            if (!room.ender && room.playerDistricts[slot].length >= 7)
                room.ender = slot;
            countPoints(slot);
            update();
            sendState(user);
        }
    })

    socket.on('kill-character', char => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 2 && players[slot].action === 'assassin-action' && ~[2,3,4,5,6,7,8].indexOf(char)) {
            room.assassined = char;
            players[slot].action = null;
            update();
            sendState(user);
        }
    });

    socket.on('rob-character', char => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 2 && players[slot].action === 'thief-action' && ~[3,4,5,6,7,8].indexOf(char) && room.assassined != char) {
            room.robbed = char;
            players[slot].action = null;
            update();
            sendState(user);
        }
    });

    socket.on('exchange-hand', (slot_d) => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase === 2 && players[slot].action === 'magician-action' && players[slot_d]) {
            players[slot].action = null;
            if (slot_d == slot) {
                let size = players[slot].hand.length;
                state.districtDeck.push(...players[slot].hand.splice(0));
                players[slot].hand = state.districtDeck.splice(0, size);
                sendState(user);
            } else {
                [players[slot].hand, players[slot_d].hand] = [players[slot_d].hand, players[slot].hand];
                room.playerHand[slot] = players[slot].hand.length;
                room.playerHand[slot_d] = players[slot_d].hand.length;
                countPoints(slot);
                update();
                sendStateSlot(slot);
                sendStateSlot(slot_d);
            }
        }
    });

    socket.on('destroy', (slot_d, card) => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase === 2 && players[slot].action === 'warlord-action' && room.playerDistricts[slot_d][card]) {
            if (state.characterRoles[5] === slot_d && room.assassined !== 5) 
                return 'You cannot use ability on the Bishop\'s districts.';
            if (room.playerDistricts[slot_d].length >= 7) 
                return 'You cannot use ability on the completed city.';
            const building = room.playerDistricts[slot_d][card];
            if (building === 19) 
                return 'You cannot use ability on the Keep.';
            const cost = utils.distincts[building].cost - 1 + include(slot_d, 29) * (building != 29);
            if (room.playerGold[slot] < cost)
                return `You don't have enough coins (${room.playerGold[slot]}/${cost}).`;
            players[slot].action = null;
            room.playerGold[slot] -= cost;
            state.districtDeck.push(...room.playerDistricts[slot_d].splice(card,1));
            countPoints(slot_d);
            countPoints(slot)
            update();
            sendState(user);
        }
    })

    socket.on('end-turn', () => {
        const slot = room.playerSlots.indexOf(user);
        if (room.phase == 2 && slot == room.currentPlayer && room.tookResource) {
            if (!room.playerGold[slot] && include(slot, 21))
                room.playerGold[slot] += 1;
            if (!players[slot].hand.length && include(slot, 28)) {
                players[slot].hand.push(...state.districtDeck.splice(0, 2));
                room.playerHand[slot] += 2;
            }
            players[slot].action = null;
            countPoints(slot);
            sendState(user);
            nextCharacter();
        }
    })

    socket.on("start-game", () => {
        if (user === room.hostId)
            startGame();
    })

    socket.on("toggle-lock", () => {
        if (user === room.hostId)
            room.teamsLocked = !room.teamsLocked;
        update();
    })

    socket.on("players-join", slot => {
        if (!room.teamsLocked && room.playerSlots[slot] === null) {
            if (~room.playerSlots.indexOf(user))
                room.playerSlots[room.playerSlots.indexOf(user)] = null;
            room.playerSlots[slot] = user;
            players[slot] = players[slot] || {};
            room.spectators.delete(user);
            update();
            sendState(user)
        }
    });

    socket.on("spectators-join", () => {
        if (!room.teamsLocked && ~room.playerSlots.indexOf(user)) {
            room.playerSlots[room.playerSlots.indexOf(user)] = null;
            room.spectators.add(user);
            update();
            sendState(user);
        }
    })

    socket.on("change-name", value => {
        if (value)
            room.playerNames[user] = value.substr && value.substr(0, 60);
        update();
    });

    socket.on("disconnect", () => {
        if (room) {
            room.onlinePlayers.delete(user);
            if (room.spectators.has(user))
                delete room.playerNames[user];
            room.spectators.delete(user);
            delete sockets[room.roomId][user];
            update();
        }
    });

});