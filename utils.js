const distincts = {
    1: {type: 5, cost: 1, quantity: 3},
    2: {type: 5, cost: 2, quantity: 3},
    3: {type: 5, cost: 3, quantity: 3},
    4: {type: 5, cost: 5, quantity: 2},

    5: {type: 8, cost: 1, quantity: 3},
    6: {type: 8, cost: 2, quantity: 3},
    7: {type: 8, cost: 3, quantity: 3},
    8: {type: 8, cost: 5, quantity: 2},
    
    9: {type: 4, cost: 3, quantity: 5},
    10: {type: 4, cost: 4, quantity: 4},
    11: {type: 4, cost: 5, quantity: 3},
    
    12: {type: 6, cost: 1, quantity: 5},
    13: {type: 6, cost: 2, quantity: 4},
    14: {type: 6, cost: 2, quantity: 3},
    15: {type: 6, cost: 3, quantity: 3},
    16: {type: 6, cost: 4, quantity: 3},
    17: {type: 6, cost: 5, quantity: 2},

    18: {ype: 9, cost: 2, quantity: 1},
    19: {type: 9, cost: 3, quantity: 1},
    20: {type: 9, cost: 4, quantity: 1},
    21: {type: 9, cost: 4, quantity: 1},
    22: {type: 9, cost: 5, quantity: 1},
    23: {type: 9, cost: 5, quantity: 1},
    24: {type: 9, cost: 5, quantity: 1},
    25: {type: 9, cost: 5, quantity: 1},
    26: {type: 9, cost: 6, quantity: 1},
    27: {type: 9, cost: 6, quantity: 1},
    28: {type: 9, cost: 6, quantity: 1},
    29: {type: 9, cost: 6, quantity: 1}
}

const shuffle = array => {
    for (let i = array.length-1; i > 0; i--) {
        let j = Math.floor(Math.random()*(i+1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}

const createDeck = () => {
    const deck = Array();
    for (key in distincts) {
        for (i = 0; i < distincts[key].quantity; i++) deck.push(Number(key))
    }
    return shuffle(deck);
}

module.exports = {
    distincts: distincts,
    shuffle: shuffle,
    createDeck: createDeck
}