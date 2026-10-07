const setup = require("./public/setup");
const districts = setup.districts;

const shuffle = array => {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const createDeck = (players, districtsFilter, onlyFilter, basicCounts) => {
    const selected = new Set(setup.normalizeUniqueDistricts(districtsFilter, players));
    const counts = setup.normalizeBasicCounts(onlyFilter ? {} : basicCounts);
    const deck = [];
    Object.keys(districts).forEach(key => {
        const district = districts[key];
        const quantity = district.type === 9 ? Number(selected.has(key)) : counts[key];
        for (let i = 0; i < quantity; i++)
            deck.push({type: key, cost: district.cost, kind: district.type});
    });
    return shuffle(deck);
};

const getUniqueDistricts = () => setup.uniqueIds.slice();

// The supplied arrays own the cards; transfers consume them, preserving identity.
const discardDistrictCards = (state, cards) => {
    state.districtDiscard.push(...cards.splice(0));
};

const drawDistrictCards = (state, count) => {
    if (!Number.isSafeInteger(count) || count < 0)
        throw new Error("Неверное количество карт для добора.");
    const drawn = [];
    while (drawn.length < count) {
        if (!state.districtDeck.length) {
            if (!state.districtDiscard.length) break;
            state.districtDeck.push(...shuffle(state.districtDiscard.splice(0)));
        }
        drawn.push(...state.districtDeck.splice(0, count - drawn.length));
    }
    return drawn;
};

const dealStartingHands = (deck, players, starting, firstCrownIndex = 0) => {
    starting = setup.normalizeStarting(starting);
    const {handSize, minUnique, exactUnique, firstCrownReduction} = starting;
    if (!Number.isInteger(players) || players < 2 || players > 8)
        throw new Error("Для раздачи нужно от 2 до 8 игроков.");
    if (!Number.isInteger(firstCrownIndex) || firstCrownIndex < 0 || firstCrownIndex >= players)
        throw new Error("Неверный индекс первого владельца короны.");
    const required = setup.getStartingRequirements(starting, players);
    const specials = deck.filter(card => card.kind === 9);
    if (required.cards > deck.length || required.unique > specials.length)
        throw new Error("Недостаточно карт для стартовой раздачи.");
    if (exactUnique && required.basic > deck.length - specials.length)
        throw new Error("Недостаточно базовых кварталов для фиксированного числа особых.");
    shuffle(specials);
    const hands = Array.from({length: players}, () => specials.splice(0, minUnique));
    const reserved = new Set(hands.flat());
    const remaining = deck.filter(card => !reserved.has(card) && (!exactUnique || card.kind !== 9));
    hands.forEach((hand, index) => {
        const size = handSize - (index === firstCrownIndex ? firstCrownReduction.cards : 0);
        hand.push(...remaining.splice(0, size - minUnique));
        hand.forEach(card => reserved.add(card));
        shuffle(hand);
    });
    for (let i = deck.length - 1; i >= 0; i--)
        if (reserved.has(deck[i])) deck.splice(i, 1);
    return hands;
};

// Only server-generated discards belong here; manual duel discards stay unrestricted.
const takeRandomCharacters = (deck, count, excluded = [], protectCrown = false) => {
    if (!Number.isSafeInteger(count) || count < 0)
        throw new Error("Неверное количество случайно сбрасываемых персонажей.");
    const candidates = deck.filter(id => !excluded.includes(id) && (!protectCrown || !["4_1", "4_2", "4_3"].includes(id)));
    if (candidates.length < count)
        throw new Error("Недостаточно персонажей для случайного сброса без повторений.");
    const selected = shuffle(candidates).slice(0, count);
    selected.forEach(id => deck.splice(deck.indexOf(id), 1));
    return selected;
};

module.exports = {districts, shuffle, createDeck, getUniqueDistricts,
    discardDistrictCards, drawDistrictCards, dealStartingHands, takeRandomCharacters};
