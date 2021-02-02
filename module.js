function init(wsServer, path) {
    const
        app = wsServer.app,
        registry = wsServer.users,
        EventEmitter = require("events"),
        utils = require('./utils'),
        channel = "citadels",
        testMode = process.argv[2] === "debug";

    registry.handleAppPage(path, `${__dirname}/public/app.html`);

    app.use("/citadels", wsServer.static(`${__dirname}/public`));

    app.get('/', (req, res) => {
        res.sendFile(__dirname + '/public/app.html');
    });

    class GameState extends wsServer.users.RoomState {
        constructor(hostId, hostData, userRegistry) {
            super(hostId, hostData, userRegistry);
            const room = {
                ...this.room,
                inited: true,
                hostId: hostId,
                playerSlots: Array(8).fill(null),
                playerNames: {},
                onlinePlayers: new JSONSet(),
                spectators: new JSONSet(),
                teamsLocked: false,
                phase: 0,
                currentPlayer: null,
                currentCharacter: 0,
                testMode,
                playerGold: {},
                playerHand: {},
                playerDistricts: {},
                playerCharacter: {},
                playerScore: {},
                uniqueDistricts: utils.getUniqueDistricts()
            };
            if (testMode)
                [1, 2, 3, 4].forEach((_, ind) => {
                    room.playerSlots[ind] = `kek${ind}`;
                    room.playerNames[`kek${ind}`] = `kek${ind}`;
                });
            this.room = room;
            this.lastInteraction = new Date();
            const state = {
                players: {},
                districtDeck: [],
                characterDeck: [],
                characterRoles: {}
            };
            const players = state.players;
            this.state = state;
            const
                send = (target, event, data) => userRegistry.send(target, event, data),
                update = () => send(room.onlinePlayers, "state", room),
                sendSlot = (slot, event, data) => {
                    send(room.playerSlots[slot], event, data);
                },
                sendState = (user) => {
                    const slot = room.playerSlots.indexOf(user);
                    if (players[slot]) {
                        send(user, "player-state", players[slot]);
                    } else send(user, "player-state", {})
                },
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
                        if (slot > 7)
                            slot = 0;
                        else
                            slot++;
                    }
                    return slot;
                },
                startGame = (districts) => {
                    state.playersCount = room.playerSlots.filter((user) => user !== null).length;
                    if (state.playersCount > 1) {
                        room.playerGold = {};
                        room.playerHand = {};
                        room.playerDistricts = {};
                        room.playerCharacter = {};
                        room.playerScore = {};
                        room.teamsLocked = true;
                        state.districtDeck = utils.createDeck(state.playersCount, districts);
                        if (room.winnerPlayer != null)
                            utils.shuffle(room.playerSlots);
                        room.playerSlots.forEach((player, slot) => {
                            if (player != null) {
                                players[slot] = {
                                    hand: state.districtDeck.splice(0, 4)
                                };
                                room.playerGold[slot] = (slot === 0 && testMode) ? 99 : 2;
                                room.playerHand[slot] = 4;
                                room.playerDistricts[slot] = [];
                                room.playerCharacter[slot] = [];
                                room.playerScore[slot] = 0;
                            } else
                                delete players[slot];
                        });

                        room.king = getRandomPlayer();
                        room.ender = null;
                        room.winnerPlayer = null;
                        state.maxDistricts = state.playersCount < 4 ? 8 : 7;
                        newRound();
                    }
                },
                newRound = () => {
                    room.phase = 1;
                    room.currentCharacter = 0;
                    state.characterDeck = [...room.characterInGame];
                    let discard = state.playersCount + 1 === room.characterInGame.length || state.playersCount < 4 ? 0 : room.characterInGame.length - 2 - state.playersCount;
                    room.characterFace = utils.shuffle(state.characterDeck.filter(card => card !== 4)).splice(0, discard);
                    state.characterDeck = state.characterDeck.filter(card => !room.characterFace.includes(card));

                    let rnd = Math.floor(Math.random() * state.characterDeck.length);
                    state.discarded = state.characterDeck.splice(rnd, 1);

                    Object.keys(players).forEach(slot => {
                        players[slot].character = [];
                        room.playerCharacter[slot] = [];
                    });
                    state.characterRoles = {};

                    room.assassined = null;
                    room.robbed = null;
                    room.currentPlayer = room.king;
                    players[room.currentPlayer].action = 'choose';
                    players[room.currentPlayer].choose = state.characterDeck;
                    update();
                    updateState();
                },
                nextChoose = () => {
                    if (state.playersCount === 3 && state.characterDeck.length === 5) {
                        let rnd = Math.floor(Math.random() * state.characterDeck.length);
                        state.characterDeck.splice(rnd, 1);
                        return nextChoose();
                    }
                    players[room.currentPlayer].action = null;
                    players[room.currentPlayer].choose = null;
                    sendStateSlot(room.currentPlayer);
                    if (state.characterDeck.length > 1) {
                        room.currentPlayer = getNextPlayer();
                        players[room.currentPlayer].action = 'choose';
                        players[room.currentPlayer].choose = state.characterDeck;
                        update();
                        sendStateSlot(room.currentPlayer);
                    } else if (state.playersCount + 1 === room.characterInGame.length && state.discarded) {
                        state.characterDeck.push(state.discarded);
                        state.characterDeck.sort((a, b) => a - b);
                        state.discarded = null;
                        room.currentPlayer = getNextPlayer();
                        players[room.currentPlayer].action = 'choose';
                        players[room.currentPlayer].choose = state.characterDeck;
                        update();
                        sendStateSlot(room.currentPlayer);
                    } else {
                        let _theater = -1;
                        Object.keys(players).forEach(slot => _theater = include(Number(slot), 'theater') ? Number(slot) : _theater);
                        if (_theater === -1) {
                            room.phase = 2;
                            nextCharacter();
                        } else {
                            room.phase = 1.5;
                            sendStateSlot(room.currentPlayer);
                            room.currentPlayer = _theater;
                            players[room.currentPlayer].action = 'theater-action';
                            update();
                            sendStateSlot(room.currentPlayer);
                        }
                    }
                },
                nextChoose2 = () => {
                    switch (state.characterDeck.length) {
                        case 6:
                        case 4:
                        case 2:
                            players[room.currentPlayer].action = null;
                            players[room.currentPlayer].choose = null;
                            sendStateSlot(room.currentPlayer);
                            room.currentPlayer = getNextPlayer();
                            players[room.currentPlayer].action = 'choose';
                            players[room.currentPlayer].choose = state.characterDeck;
                            update();
                            sendStateSlot(room.currentPlayer);
                            break;
                        case 5:
                        case 3:
                            players[room.currentPlayer].action = 'discard';
                            update();
                            sendStateSlot(room.currentPlayer);
                            break;
                        case 1:
                            players[room.currentPlayer].action = null;
                            players[room.currentPlayer].choose = null;
                            sendStateSlot(room.currentPlayer);
                            room.phase = 2;
                            nextCharacter();
                    }
                },
                nextCharacter = () => {
                    room.currentCharacter++;
                    if (room.currentCharacter > room.characterInGame.length) return endRound();
                    room.currentPlayer = state.characterRoles[room.currentCharacter];
                    if (room.currentPlayer == undefined || room.assassined === room.currentCharacter) return nextCharacter();
                    room.playerCharacter[room.currentPlayer][players[room.currentPlayer].character.indexOf(room.currentCharacter)] = room.currentCharacter;

                    if (room.robbed === room.currentCharacter) {
                        let gold = room.playerGold[room.currentPlayer];
                        room.playerGold[room.currentPlayer] = 0;
                        countPoints(room.currentPlayer);
                        room.playerGold[state.characterRoles[2]] += gold;
                        countPoints(state.characterRoles[2]);
                    }

                    room.buildDistricts = 1;
                    room.tookResource = false;
                    room.forgeryAction = true;
                    room.laboratoryAction = true;
                    room.museumAction = true;
                    switch (room.currentCharacter) {
                        case 4:
                        case 5:
                        case 6:
                        case 8:
                            room.incomeAction = true;
                            break;
                        default:
                            room.incomeAction = false;
                            break;
                    }
                    players[room.currentPlayer].action = null;
                    switch (room.currentCharacter) {
                        case 1:
                            players[room.currentPlayer].action = 'assassin-action';
                            break;
                        case 2:
                            players[room.currentPlayer].action = 'thief-action';
                            break;
                        case 3:
                            players[room.currentPlayer].action = 'magician-action';
                            break;
                        case 4:
                            room.king = room.currentPlayer;
                            break;
                        case 6:
                            room.playerGold[room.currentPlayer] += 1;
                            countPoints(room.currentPlayer);
                            break;
                        case 7:
                            room.playerHand[room.currentPlayer] += 2;
                            players[room.currentPlayer].hand.push(...state.districtDeck.splice(0, 2));
                            room.buildDistricts = 3;
                            countPoints(room.currentPlayer);
                            break;
                        case 8:
                            players[room.currentPlayer].action = 'warlord-action';
                            break;
                        case 9:
                            players[room.currentPlayer].action = 'artist-action';
                            players[room.currentPlayer].artistAction = 2;
                            break;
                    }

                    update();
                    sendStateSlot(room.currentPlayer);
                },
                endRound = () => {
                    room.king = '4' in state.characterRoles ? state.characterRoles[4] : room.king;
                    if (room.ender !== null) return endGame();
                    newRound();
                },
                endGame = () => {
                    room.currentPlayer = null;
                    Object.keys(players).forEach(slot => {
                        countPoints(Number(slot));
                        if (includeHand(slot, "secret_vault")) {
                            room.playerDistricts[slot].push({type: "secret_vault", cost: 0});
                            room.playerScore[slot] += 3;
                        }
                        players[slot].character = [];
                        room.playerCharacter[slot] = [];
                    });
                    let maxPoints = 0;
                    for (let i = 1; i <= room.characterInGame.length; i++) {
                        if (state.characterRoles[i] !== null)
                            if (room.playerScore[state.characterRoles[i]] >= maxPoints) {
                                maxPoints = room.playerScore[state.characterRoles[i]];
                                room.winnerPlayer = state.characterRoles[i];
                            }
                    }
                    room.phase = 0;
                    update();
                    updateState();
                },
                countPoints = (slot) => {
                    room.playerScore[slot] = room.playerDistricts[slot].map(card => getDistrictCost(card)).reduce((a, b) => a + b, 0);
                    if (room.ender == slot) room.playerScore[slot] += 2;
                    if (getDistrictsCount(slot) >= state.maxDistricts) room.playerScore[slot] += 2;

                    room.playerScore[slot] += 2 * include(slot, "dragon_gate");
                    room.playerScore[slot] += room.playerHand[slot] * include(slot, "map_room");
                    room.playerScore[slot] += room.playerGold[slot] * include(slot, "imperial_treasury");
                    room.playerScore[slot] += room.playerDistricts[slot].filter(card => getDistrictCost(card) % 2).length * include(slot, "basilica");
                    if (include(slot, "memorial") && room.king === slot) room.playerScore[slot] += 5;

                    let hqtypes = include(slot, "haunted_quarter") ? [4, 5, 6, 8, 9] : [9];
                    let maxBonusPoints = 0;

                    hqtypes.map(hqtype => {
                        let acc = {4: 0, 5: 0, 6: 0, 8: 0, 9: 0};
                        let bonusPoints = 0;
                        room.playerDistricts[slot].map(card => card.type === "haunted_quarter" ? hqtype : utils.districts[card.type].type)
                            .reduce((acc, current) => {
                                acc[current]++;
                                return acc;
                            }, acc);
                        if (Math.min(...Object.keys(acc).map((type) => acc[type]))) bonusPoints += 3;
                        if (include(slot, "ivory_tower") && acc[9] === 1) bonusPoints += 5;
                        bonusPoints += acc[9] * include(slot, "well_of_wishes");
                        if (Math.max(...Object.keys(acc).map((type) => acc[type])) >= 3) bonusPoints += 3 * include(slot, "capitol");
                        maxBonusPoints = Math.max(maxBonusPoints, bonusPoints);
                    });
                    room.playerScore[slot] += maxBonusPoints;
                },
                getDistrictsCount = (slot) => {
                    let districtsCount = room.playerDistricts[slot].length;
                    if (include(slot, "monument"))
                        districtsCount++;
                    return districtsCount;
                },
                getDistrictCost = (card) => utils.districts[card.type].cost
                    + (card.decoration ? 1 : 0) + (card.exposition ? card.exposition.length : 0),
                include = (slot, card) => room.playerDistricts[slot].some(building => building.type === card),
                isCharactersValid = (characters) => {
                    if (!([8, 9].includes(characters.length) && characters.every((character, index) => {
                        //const match = character.match(/^([1-9])_([1-3])$/); 3 char packs
                        const match = character.match(/^([1-9])_([1-2])$/); //2 char packs
                        return match && +match[1] === (index + 1);
                    })))
                        return false;
                    else {
                        const
                            playerCount = room.playerSlots.filter((user) => user !== null).length,
                            hasNineCharacter = characters.length === 9;
                        if (playerCount === 2 && hasNineCharacter)
                            return false;
                        else if ([3, 8].includes(playerCount) && !hasNineCharacter)
                            return false;
                        return true;
                    }
                },
                isDistrictsValid = (districts) => {
                    if (districts.length === (new Set(districts)).size && districts.every((districts) => room.uniqueDistricts.includes(districts)))
                        return true;
                },
                includeHand = (slot, card) => players[slot].hand.some(building => building.type === card),
                getPlayerDistrictIndex = (slot, card) => room.playerDistricts[slot].findIndex((it) => it.type === card),
                getPlayerDistrict = (slot, card) => room.playerDistricts[slot][getPlayerDistrictIndex(slot, card)],
                build = (slot, cardInd, replaceCardInd, noRequireGold) => {
                    const
                        building = players[slot].hand[cardInd],
                        districts = room.playerDistricts[slot];
                    if (!(room.buildDistricts || building.type === "stable")) return;
                    if (building.type === "monument" && districts.length + 2 >= state.maxDistricts)
                        return sendSlot(slot, "message", "Вы не можете построить Монумент как последнее строение");
                    if (building.type === "secret_vault")
                        return sendSlot(slot, "message", "Вы не можете построить Тайное убежище");
                    if (include(slot, building.type) && !include(slot, "quarry"))
                        return sendSlot(slot, "message", 'У вас уже есть такой квартал');
                    const cost = getDistrictCost(building) - include(slot, "factory") * (utils.districts[building.type].type === 9);
                    if (!noRequireGold && room.playerGold[slot] < cost)
                        return sendSlot(slot, "message", `У вас не хватает монет (${room.playerGold[slot]}/${cost}).`);
                    if (building.type !== "stable")
                        room.buildDistricts -= 1;
                    if (!noRequireGold)
                        room.playerGold[slot] -= cost;
                    districts.push(...players[slot].hand.splice(cardInd, 1));
                    room.playerHand[slot] -= 1;
                    if (replaceCardInd !== undefined)
                        destroy(slot, replaceCardInd);
                    if (room.ender === null && getDistrictsCount(slot) >= state.maxDistricts)
                        room.ender = slot;
                    countPoints(slot);
                    update();
                    sendStateSlot(slot);
                    return true;
                },
                destroy = (slot_d, cardInd) => {
                    const building = room.playerDistricts[slot_d][cardInd];
                    if (building.exposition) {
                        state.districtDeck.push(...building.exposition);
                        delete building.exposition;
                    }
                    if (building.decoration) {
                        delete building.decoration;
                    }
                    dropCardDistricts(slot_d, cardInd);
                },
                dropCardHand = (slot, cardInd) => state.districtDeck.push(...players[slot].hand.splice(cardInd, 1)),
                dropCardDistricts = (slot, cardInd) => state.districtDeck.push(...room.playerDistricts[slot].splice(cardInd, 1)),
                removePlayer = (playerId) => {
                    if (room.spectators.has(playerId)) {
                        this.emit("user-kicked", playerId);
                        room.spectators.delete(playerId);
                    } else {
                        room.playerSlots[room.playerSlots.indexOf(playerId)] = null;
                        if (room.onlinePlayers.has(playerId)) {
                            room.spectators.add(playerId);
                            sendState(playerId);
                        }
                    }
                },
                userJoin = (data) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    update();
                    sendState(user);
                },
                userLeft = (user) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    update();
                },
                userEvent = (user, event, data) => {
                    this.lastInteraction = new Date();
                    try {
                        if (this.userEventHandlers[event])
                            this.userEventHandlers[event](user, data[0], data[1], data[2], data[3]);
                        else if (this.slotEventHandlers[event] && ~room.playerSlots.indexOf(user))
                            this.slotEventHandlers[event](room.playerSlots.indexOf(user), data[0], data[1], data[2], data[3]);
                    } catch (error) {
                        console.error(error);
                        registry.log(error.message);
                    }
                };

            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.slotEventHandlers = {
                "take-character": (slot, value) => {
                    if (room.phase === 1 && slot === room.currentPlayer && players[slot].action === 'choose' && ~state.characterDeck[value]) {
                        let role = state.characterDeck.splice(value, 1)[0];
                        players[slot].character.push(role);
                        room.playerCharacter[slot].push(0);
                        state.characterRoles[role] = slot;
                        state.playersCount == 2 ? nextChoose2() : nextChoose();
                    }
                },
                "discard-character": (slot, value) => {
                    if (room.phase === 1 && slot === room.currentPlayer && players[slot].action === 'discard' && ~state.characterDeck[value]) {
                        state.characterDeck.splice(value, 1)[0];
                        nextChoose2();
                    }
                },
                "theater-action": (slot, slot_d) => {
                    if (room.phase === 1.5 && players[slot_d] && players[slot].action === 'theater-action') {
                        if (slot !== slot_d) {
                            [players[slot].character, players[slot_d].character] = [players[slot_d].character, players[slot].character];
                            [state.characterRoles[players[slot].character], state.characterRoles[players[slot_d].character]]
                                = [state.characterRoles[players[slot_d].character], state.characterRoles[players[slot].character]];
                            sendStateSlot(slot_d);
                        }
                        room.phase = 2;
                        players[slot].action === null;
                        sendStateSlot(slot);
                        nextCharacter();
                    }
                },
                "take-resources": (slot, res) => {
                    if (room.phase === 2 && slot === room.currentPlayer && !room.tookResource && ~['coins', 'card'].indexOf(res)) {
                        if (res === 'coins') {
                            room.tookResource = true;
                            room.playerGold[slot] += 2;
                            if (include(slot, "gold_mine"))
                                room.playerGold[slot] += 1;
                        } else {
                            if (!state.districtDeck.length) return;
                            room.tookResource = true;
                            const cardsToTake = state.districtDeck.splice(0, 2 + include(slot, "observatory"));
                            if (include(slot, "library")) {
                                players[slot].hand.push(...cardsToTake);
                                room.playerHand[slot] += cardsToTake.length;
                            } else {
                                players[slot].choose = cardsToTake;
                                room.phase = 3;
                            }
                        }
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "take-card": (slot, cardInd) => {
                    if (room.phase === 3 && slot === room.currentPlayer && ~players[slot].choose[cardInd]) {
                        players[slot].hand.push(...players[slot].choose.splice(cardInd, 1));
                        state.districtDeck.push(...players[slot].choose.splice(0));
                        room.playerHand[slot] += 1;
                        room.phase = 2;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "take-income": (slot) => {
                    if (room.phase === 2 && slot === room.currentPlayer && room.incomeAction) {
                        room.incomeAction = false;
                        let income = room.playerDistricts[slot].map(card => utils.districts[card.type].type)
                                .filter(type => type === room.currentCharacter).length
                            + include(slot, "school_of_magic");
                        room.playerGold[slot] += income;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "build": (slot, cardInd) => {
                    if (room.phase === 2 && slot === room.currentPlayer && players[slot].hand[cardInd])
                        build(slot, cardInd);
                },
                "kill-character": (slot, char) => {
                    if (room.phase === 2 && players[slot].action === 'assassin-action' && ~room.characterInGame.indexOf(char) && char != 1) {
                        room.assassined = char;
                        players[slot].action = null;
                        update();
                        sendStateSlot(slot);
                    }
                },
                "rob-character": (slot, char) => {
                    if (room.phase === 2 && players[slot].action === 'thief-action' && ~room.characterInGame.indexOf(char) && room.assassined !== char && char > 2) {
                        room.robbed = char;
                        players[slot].action = null;
                        update();
                        sendStateSlot(slot);
                    }
                },
                "exchange-hand": (slot, slot_d, cardInds) => {
                    if (room.phase === 2 && players[slot].action === 'magician-action' && players[slot_d]) {
                        players[slot].action = null;
                        if (slot_d === slot) {
                            if (!cardInds.length) return players[slot].action = 'magician-action';
                            let _cards = cardInds.sort((a, b) => b - a);
                            for (let key in _cards) dropCardHand(slot, _cards[key]);
                            players[slot].hand.push(...state.districtDeck.splice(0, _cards.length));
                            sendStateSlot(slot);
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
                },
                "destroy": (slot, slot_d, cardInd) => {
                    if (room.phase === 2 && players[slot].action === 'warlord-action' && room.playerDistricts[slot_d][cardInd]) {
                        if (state.characterRoles[5] === slot_d && room.assassined !== 5)
                            return sendSlot(slot, "message", 'Вы не можете использовать способность на построках Епископа');
                        if (getDistrictsCount(slot_d) >= state.maxDistricts)
                            return sendSlot(slot, "message", 'Вы не можете использовать способность на законченном городе');
                        const building = room.playerDistricts[slot_d][cardInd];
                        if (building.type === "keep")
                            return sendSlot(slot, "message", 'Вы не можете использовать способность на Форт');
                        const cost = getDistrictCost(building) - 1 + include(slot_d, "great_wall") * (building.type !== "great_wall");
                        if (room.playerGold[slot] < cost)
                            return sendSlot(slot, "message", `Недостаточно монет ${room.playerGold[slot]}/${cost}).`);
                        players[slot].action = null;
                        room.playerGold[slot] -= cost;
                        destroy(slot_d, cardInd);
                        countPoints(slot_d);
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "arsenal-destroy": (slot, slot_d, cardInd) => {
                    if (room.phase === 2 && slot === room.currentPlayer && include(slot, 'arsenal') && room.playerDistricts[slot_d][cardInd]) {
                        if (getDistrictsCount(slot_d) >= state.maxDistricts)
                            return sendSlot(slot, "message", 'Вы не можете использовать Арсенал на законченном городе');
                        destroy(slot_d, cardInd);
                        destroy(slot, room.playerDistricts[slot].findIndex(card => card.type === 'arsenal'));
                        countPoints(slot_d);
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "forgery-action": (slot) => {
                    if (room.phase === 2 && slot === room.currentPlayer && include(slot, 'forgery') && room.forgeryAction && room.playerGold[slot] > 1) {
                        players[slot].hand.push(...state.districtDeck.splice(0, 3));
                        room.playerGold[slot] -= 2;
                        room.playerHand[slot] = players[slot].hand.length;
                        room.forgeryAction = false;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "framework-action": (slot, cardInd) => {
                    if (room.phase === 2 && slot === room.currentPlayer && include(slot, 'framework')
                        && players[slot].hand[cardInd]) {
                        build(slot, cardInd, getPlayerDistrictIndex(slot, "framework"), true)
                    }
                },
                "museum-action": (slot, cardInd) => {
                    if (room.phase === 2 && slot === room.currentPlayer && include(slot, 'museum')
                        && room.museumAction && players[slot].hand[cardInd]) {
                        const museum = getPlayerDistrict(slot, "museum");
                        museum.exposition = museum.exposition || [];
                        museum.exposition.push(...players[slot].hand.splice(cardInd, 1));
                        room.playerHand[slot]--;
                        room.museumAction = false;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "laboratory-action": (slot, cardInd) => {
                    if (room.phase === 2 && slot === room.currentPlayer && include(slot, 'laboratory')
                        && room.laboratoryAction && players[slot].hand[cardInd]) {
                        dropCardHand(slot, cardInd);
                        room.playerHand[slot]--;
                        room.playerGold[slot] += 2;
                        room.laboratoryAction = false;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "build-necropolis": (slot, cardInd) => {
                    if (room.phase === 2 && slot === room.currentPlayer && includeHand(slot, 'necropolis')
                        && players[slot].hand[cardInd]) {
                        build(slot,
                            players[slot].hand.findIndex((card) => card.type === "necropolis"),
                            cardInd,
                            true);
                    }
                },
                "build-den-of-thieves": (slot, cardIndexes) => {
                    if (room.phase === 2 && slot === room.currentPlayer && includeHand(slot, 'den_of_thieves')
                        && cardIndexes && cardIndexes.every && cardIndexes.every((cardInd) => players[slot].hand[cardInd])
                        && (room.playerGold[slot] + cardIndexes.length) >= 6) {
                        const
                            cardsToDrop = players[slot].hand.filter((card, ind) => cardIndexes.includes(ind)),
                            wasBuilt = build(
                                slot,
                                players[slot].hand.findIndex((card) => card.type === "den_of_thieves"),
                                undefined,
                                true);
                        if (wasBuilt) {
                            room.playerGold[slot] -= Math.max(0, 6 - cardIndexes.length);
                            room.playerHand[slot] -= cardIndexes.length;
                            players[slot].hand.forEach((card, ind) => {
                                if (cardsToDrop.includes(card))
                                    dropCardHand(slot, ind);
                            });
                        }
                        update();
                    }
                },
                "beautify": (slot, slot_d, cardInd) => {
                    if (room.phase === 2 && players[slot].action === 'artist-action' && players[slot].artistAction
                        && slot === slot_d && room.playerDistricts[slot][cardInd] && !room.playerDistricts[slot][cardInd].decoration && room.playerGold[slot]) {
                        room.playerDistricts[slot][cardInd].decoration = true;
                        players[slot].artistAction -= 1;
                        room.playerGold[slot] -= 1;
                        countPoints(slot);
                        update();
                        sendStateSlot(slot);
                    }
                },
                "end-turn": (slot) => {
                    if (room.phase === 2 && slot === room.currentPlayer && room.tookResource) {
                        if (!room.playerGold[slot] && include(slot, "poor_house"))
                            room.playerGold[slot] += 1;
                        if (!players[slot].hand.length && include(slot, "park")) {
                            players[slot].hand.push(...state.districtDeck.splice(0, 2));
                            room.playerHand[slot] += 2;
                        }
                        players[slot].action = null;
                        players[room.currentPlayer].artistAction = undefined;
                        countPoints(slot);
                        sendStateSlot(slot);
                        nextCharacter();
                    }
                }
            };
            this.userEventHandlers = {
                ...this.eventHandlers,
                "start-game": (user, characters, districts) => {
                    if (user === room.hostId && characters && characters.length && isCharactersValid(characters) && isDistrictsValid(districts)) {
                        room.characterInGame = characters;
                        startGame(districts);
                    }
                },
                "abort-game": (user) => {
                    if (user === room.hostId)
                        endGame();
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "players-join": (user, slot) => {
                    if (!room.teamsLocked && room.playerSlots[slot] === null) {
                        if (~room.playerSlots.indexOf(user))
                            room.playerSlots[room.playerSlots.indexOf(user)] = null;
                        room.playerSlots[slot] = user;
                        players[slot] = players[slot] || {};
                        room.spectators.delete(user);
                        update();
                        sendState(user)
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked && ~room.playerSlots.indexOf(user)) {
                        room.playerSlots[room.playerSlots.indexOf(user)] = null;
                        room.spectators.add(user);
                        update();
                        sendState(user);
                    }
                },
                "remove-player": (user, playerId) => {
                    if (room.hostId === user && playerId)
                        removePlayer(playerId);
                    update();
                },
                "give-host": (user, playerId) => {
                    if (room.hostId === user && playerId) {
                        room.hostId = playerId;
                        this.emit("host-changed", user, playerId);
                    }
                    update();
                },
                "change-name": (user, value) => {
                    if (value)
                        room.playerNames[user] = value.substr && value.substr(0, 60);
                    update();
                }
            };
        }

        getPlayerCount() {
            return Object.keys(this.room.playerNames).length;
        }

        getActivePlayerCount() {
            return this.room.onlinePlayers.size;
        }

        getLastInteraction() {
            return this.lastInteraction;
        }

        getSnapshot() {
            return {
                room: this.room,
                state: this.state
            };
        }

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
            this.room.onlinePlayers = new JSONSet();
            this.room.spectators = new JSONSet();
            this.room.onlinePlayers.clear();
        }
    }

    class JSONSet extends Set {
        constructor(iterable) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;
