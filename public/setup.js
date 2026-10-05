(function (root, factory) {
    if (typeof module === "object" && module.exports)
        module.exports = factory();
    else
        root.CitadelsSetup = factory();
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const districts = {

        manor: {name: "Поместье", type: 4, cost: 3, quantity: 5},
        castle: {name: "Замок", type: 4, cost: 4, quantity: 4},
        palace: {name: "Дворец", type: 4, cost: 5, quantity: 3},

        tavern: {name: "Таверна", type: 6, cost: 1, quantity: 5},
        market: {name: "Рынок", type: 6, cost: 2, quantity: 4},
        trading_post: {name: "Фактория", type: 6, cost: 2, quantity: 3},
        docks: {name: "Доки", type: 6, cost: 3, quantity: 3},
        harbor: {name: "Порт", type: 6, cost: 4, quantity: 3},
        town_hall: {name: "Ратуша", type: 6, cost: 5, quantity: 2},

        temple: {name: "Храм", type: 5, cost: 1, quantity: 3},
        church: {name: "Церковь", type: 5, cost: 2, quantity: 3},
        monastery: {name: "Монастырь", type: 5, cost: 3, quantity: 3},
        cathedral: {name: "Собор", type: 5, cost: 5, quantity: 2},

        watchtower: {name: "Сторожевая башня", type: 8, cost: 1, quantity: 3},
        prison: {name: "Тюрьма", type: 8, cost: 2, quantity: 3},
        barracks: {name: "Казарма", type: 8, cost: 3, quantity: 3},
        fortress: {name: "Крепость", type: 8, cost: 5, quantity: 2},

        secret_vault: {type: 9, cost: 0, quantity: 1},
        stable: {type: 9, cost: 2, quantity: 1},
        haunted_quarter: {type: 9, cost: 3, quantity: 1},
        keep: {type: 9, cost: 3, quantity: 1},
        memorial: {type: 9, cost: 3, quantity: 1},
        framework: {type: 9, cost: 3, quantity: 1},
        arsenal: {type: 9, cost: 3, quantity: 1},
        observatory: {type: 9, cost: 4, quantity: 1},
        poor_house: {type: 9, cost: 4, quantity: 1},
        monument: {type: 9, cost: 4, quantity: 1},
        basilica: {type: 9, cost: 4, quantity: 1},
        museum: {type: 9, cost: 4, quantity: 1},
        quarry: {type: 9, cost: 4, quantity: 1},
        ivory_tower: {type: 9, cost: 5, quantity: 1},
        well_of_wishes: {type: 9, cost: 5, quantity: 1},
        factory: {type: 9, cost: 5, quantity: 1},
        map_room: {type: 9, cost: 5, quantity: 1},
        capitol: {type: 9, cost: 5, quantity: 1},
        necropolis: {type: 9, cost: 5, quantity: 1},
        imperial_treasury: {type: 9, cost: 5, quantity: 1},
        forgery: {type: 9, cost: 5, quantity: 1},
        laboratory: {type: 9, cost: 6, quantity: 1},
        school_of_magic: {type: 9, cost: 6, quantity: 1},
        den_of_thieves: {type: 9, cost: 6, quantity: 1},
        theater: {type: 9, cost: 6, quantity: 1},
        dragon_gate: {type: 9, cost: 6, quantity: 1},
        park: {type: 9, cost: 6, quantity: 1},
        great_wall: {type: 9, cost: 6, quantity: 1},
        library: {type: 9, cost: 6, quantity: 1},
        gold_mine: {type: 9, cost: 6, quantity: 1}
    };

    const FORMAT = "citadels-setup";
    const VERSION = 1;
    const MAX_COPIES = 99;
    const MAX_FILE_SIZE = 65536;
    const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    const isObject = value => value !== null && Object.prototype.toString.call(value) === "[object Object]";
    const basicIds = Object.keys(districts).filter(id => districts[id].type !== 9);
    const uniqueIds = Object.keys(districts).filter(id => districts[id].type === 9);
    const groups = [
        {type: 4, name: "Дворянские"},
        {type: 5, name: "Церковные"},
        {type: 6, name: "Торговые"},
        {type: 8, name: "Воинские"}
    ];
    const timerPresets = {
        short: {name: "Быстрая", characterDurationMs: 60000, mainDurationMs: 40000, responseDurationMs: 10000},
        normal: {name: "Обычная", characterDurationMs: 90000, mainDurationMs: 75000, responseDurationMs: 20000},
        long: {name: "Длинная", characterDurationMs: 150000, mainDurationMs: 150000, responseDurationMs: 40000}
    };
    const timerLimits = {
        characterDurationMs: {min: 30000, max: 900000},
        mainDurationMs: {min: 30000, max: 600000},
        responseDurationMs: {min: 10000, max: 120000}
    };

    function assertObject(value, label) {
        if (!isObject(value))
            throw new Error(label + ": ожидается объект.");
    }

    function assertKeys(value, allowed, label) {
        const unknown = Object.keys(value).find(key => !allowed.includes(key));
        if (unknown !== undefined)
            throw new Error(label + ": неизвестное поле «" + unknown + "».");
    }

    function getDefaultBasicCounts() {
        const counts = {};
        basicIds.forEach(id => counts[id] = districts[id].quantity);
        return counts;
    }

    // Omitted argument means the legacy default. An explicit map is a complete
    // deck definition: omitted IDs are zero, including cards added in the future.
    function normalizeBasicCounts(value) {
        if (value === undefined)
            return getDefaultBasicCounts();
        assertObject(value, "Базовая колода");
        assertKeys(value, basicIds, "Базовая колода");
        const result = {};
        basicIds.forEach(id => {
            const count = own(value, id) ? value[id] : 0;
            if (!Number.isInteger(count) || count < 0 || count > MAX_COPIES)
                throw new Error(districts[id].name + ": укажите целое количество от 0 до " + MAX_COPIES + ".");
            result[id] = count;
        });
        return result;
    }

    function normalizeUniqueDistricts(value, players) {
        if (!Array.isArray(value) || Array.from(value).some(id => typeof id !== "string" || !uniqueIds.includes(id)))
            throw new Error("Особые кварталы: неизвестная карта или неверный список.");
        if (new Set(value).size !== value.length)
            throw new Error("Особые кварталы не должны повторяться.");
        if (players !== undefined && players < 4 && value.includes("theater"))
            throw new Error("Театр доступен только при 4–8 игроках.");
        return value.slice();
    }

    const characterRequirements = {
        "4_2": {name: "Император", players: 3},
        "9_1": {name: "Скульптор", players: 3},
        "9_2": {name: "Королева", players: 5},
        "9_3": {name: "Мытарь", players: 3}
    };

    function getCharacterPlayerErrors(value, players) {
        const errors = [];
        value.forEach(id => {
            const requirement = characterRequirements[id];
            if (requirement && players < requirement.players)
                errors.push("Для персонажа «" + requirement.name + "» нужно минимум " + requirement.players + " игроков. Сейчас: " + players + ".");
        });
        if ([3, 8].includes(players) && value.length !== 9)
            errors.push("Для " + players + " игроков нужен персонаж ранга 9.");
        return errors;
    }

    function normalizeCharacters(value, players) {
        if (!Array.isArray(value) || ![8, 9].includes(value.length) || Array.from(value).some((id, index) => {
            const match = typeof id === "string" && id.match(/^([1-9])_([1-3])$/);
            return !match || Number(match[1]) !== index + 1;
        }))
            throw new Error("Выберите по одному персонажу каждого ранга в порядке от 1 до 8 или 9.");
        if (players !== undefined) {
            const errors = getCharacterPlayerErrors(value, players);
            if (errors.length) throw new Error(errors.join("\n"));
        }
        return value.slice();
    }

    // Preserve the server's legacy defaults/clamping for old socket clients
    // and saved rooms. File imports use strict validation instead.
    function normalizeTimerSettings(value, strict) {
        const settings = value || {};
        if (strict) {
            assertObject(value, "Таймер");
            assertKeys(value, ["enabled", "preset"].concat(Object.keys(timerLimits)), "Таймер");
            if (typeof settings.enabled !== "boolean" || !(settings.preset === "custom" || own(timerPresets, settings.preset)))
                throw new Error("Таймер: неверное включение или пресет.");
            Object.keys(timerLimits).forEach(key => {
                const duration = settings[key], limit = timerLimits[key];
                if (!Number.isInteger(duration) || (duration !== 0 && (duration < limit.min || duration > limit.max)))
                    throw new Error("Таймер: " + key + " должен быть 0 или целым числом от " + limit.min + " до " + limit.max + " мс.");
            });
        }
        const preset = settings.preset === "custom" || own(timerPresets, settings.preset) ? settings.preset : "normal";
        const defaults = timerPresets[preset] || timerPresets.normal;
        const result = {enabled: settings.enabled !== false, preset};
        Object.keys(timerLimits).forEach(key => {
            const limit = timerLimits[key];
            const duration = Math.floor(Number(settings[key] !== undefined ? settings[key] : defaults[key]) || 0);
            result[key] = duration ? Math.min(limit.max, Math.max(limit.min, duration)) : 0;
        });
        result.enabled = result.enabled && Object.keys(timerLimits).some(key => result[key] > 0);
        return result;
    }

    function normalizeStarting(value = {}) {
        assertObject(value, "Стартовые ресурсы");
        assertKeys(value, ["handSize", "minUnique", "gold", "exactUnique", "firstCrownReduction"], "Стартовые ресурсы");
        const result = Object.assign({handSize: 4, minUnique: 0, gold: 2, exactUnique: false}, value);
        const labels = {handSize: "Карт на старте", minUnique: "Минимум особых кварталов", gold: "Стартовое золото"};
        Object.keys(labels).forEach(key => {
            if (!Number.isSafeInteger(result[key]) || result[key] < 0)
                throw new Error(labels[key] + ": укажите целое неотрицательное число.");
        });
        if (typeof result.exactUnique !== "boolean")
            throw new Error("Фиксированное число особых кварталов: ожидается логическое значение.");
        if (result.minUnique > result.handSize)
            throw new Error("Минимум особых кварталов не может превышать размер стартовой руки.");
        const reduction = own(value, "firstCrownReduction") ? value.firstCrownReduction : {};
        assertObject(reduction, "Уменьшение ресурсов первой короны");
        assertKeys(reduction, ["cards", "gold"], "Уменьшение ресурсов первой короны");
        result.firstCrownReduction = Object.assign({cards: 0, gold: 0}, reduction);
        ["cards", "gold"].forEach(key => {
            if (!Number.isSafeInteger(result.firstCrownReduction[key]) || result.firstCrownReduction[key] < 0)
                throw new Error("Уменьшение ресурсов первой короны: укажите целое неотрицательное число.");
        });
        if (result.firstCrownReduction.cards > result.handSize)
            throw new Error("Уменьшение карт первой короны не может превышать стартовую руку.");
        if (result.firstCrownReduction.gold > result.gold)
            throw new Error("Уменьшение золота первой короны не может превышать стартовое золото.");
        if (result.minUnique > result.handSize - result.firstCrownReduction.cards)
            throw new Error("Минимум особых кварталов не может превышать стартовую руку первого владельца короны после уменьшения.");
        return result;
    }

    function normalizeRules(value = {}) {
        assertObject(value, "Правила партии");
        assertKeys(value, ["citySize", "bonuses", "preventRepeatedRandomDiscard"], "Правила партии");
        const citySize = own(value, "citySize") ? value.citySize : null;
        if (citySize !== null && (!Number.isInteger(citySize) || citySize < 2 || citySize > 10))
            throw new Error("Размер завершённого города: укажите целое число от 2 до 10.");
        const suppliedBonuses = own(value, "bonuses") ? value.bonuses : {};
        assertObject(suppliedBonuses, "Бонусные очки");
        assertKeys(suppliedBonuses, ["firstCity", "otherCities", "allColors"], "Бонусные очки");
        const bonuses = Object.assign({firstCity: 4, otherCities: 2, allColors: 3}, suppliedBonuses);
        Object.keys(bonuses).forEach(key => {
            if (!Number.isSafeInteger(bonuses[key]) || bonuses[key] < 0)
                throw new Error("Бонусные очки: укажите целое неотрицательное число.");
        });
        const preventRepeatedRandomDiscard = own(value, "preventRepeatedRandomDiscard") ? value.preventRepeatedRandomDiscard : false;
        if (typeof preventRepeatedRandomDiscard !== "boolean")
            throw new Error("Запрет повторного случайного сброса: ожидается логическое значение.");
        return {citySize, bonuses, preventRepeatedRandomDiscard};
    }

    function getStartingResources(value, firstCrown) {
        const starting = normalizeStarting(value);
        return {
            handSize: starting.handSize - (firstCrown ? starting.firstCrownReduction.cards : 0),
            gold: starting.gold - (firstCrown ? starting.firstCrownReduction.gold : 0)
        };
    }

    function getStartingRequirements(value, players) {
        if (!Number.isInteger(players) || players < 2 || players > 8)
            throw new Error("Число игроков должно быть от 2 до 8.");
        const starting = normalizeStarting(value);
        const cards = starting.handSize * players - starting.firstCrownReduction.cards;
        const unique = starting.minUnique * players;
        return {cards, unique, basic: cards - unique};
    }

    function normalizeSetup(value) {
        assertObject(value, "Настройки");
        if (value.format !== FORMAT || value.version !== VERSION)
            throw new Error("Неподдерживаемый формат или версия файла настроек.");
        assertKeys(value, ["format", "version", "districts", "characters", "timer", "metadata", "starting", "rules"], "Настройки");
        assertObject(value.districts, "Кварталы");
        assertKeys(value.districts, ["basic", "unique"], "Кварталы");
        assertObject(value.districts.basic, "Базовая колода");
        const result = {
            format: FORMAT,
            version: VERSION,
            districts: {
                basic: normalizeBasicCounts(value.districts.basic),
                unique: normalizeUniqueDistricts(value.districts.unique)
            },
            characters: normalizeCharacters(value.characters),
            timer: normalizeTimerSettings(value.timer, true),
            starting: normalizeStarting(value.starting),
            rules: normalizeRules(value.rules)
        };
        if (value.metadata !== undefined) {
            assertObject(value.metadata, "Метаданные");
            result.metadata = Object.assign({}, value.metadata);
        }
        return result;
    }

    function parseSetup(text) {
        if (typeof text !== "string" || text.length > MAX_FILE_SIZE)
            throw new Error("Файл настроек должен быть не больше 64 КБ.");
        let value;
        try {
            value = JSON.parse(text.replace(/^\uFEFF/, ""));
        } catch (error) {
            throw new Error("Не удалось прочитать JSON. Проверьте содержимое файла.");
        }
        return normalizeSetup(value);
    }

    function serializeSetup(value) {
        return JSON.stringify(normalizeSetup(value), null, 2) + "\n";
    }

    function getDefaultSetup(players = 2) {
        return normalizeSetup({
            format: FORMAT, version: VERSION,
            districts: {basic: getDefaultBasicCounts(), unique: [
                "dragon_gate", "factory", "haunted_quarter", "imperial_treasury", "keep",
                "laboratory", "library", "map_room", "quarry", "den_of_thieves", "well_of_wishes"
            ]},
            characters: Array.from({length: [3, 8].includes(players) ? 9 : 8}, (_, index) => (index + 1) + "_1"),
            timer: normalizeTimerSettings(), metadata: {presetId: "basic"}
        });
    }

    function getDeckSummary(basic, unique) {
        const counts = normalizeBasicCounts(basic);
        const selected = normalizeUniqueDistricts(unique);
        const byType = {};
        groups.forEach(group => byType[group.type] = 0);
        basicIds.forEach(id => byType[districts[id].type] += counts[id]);
        const basicTotal = basicIds.reduce((sum, id) => sum + counts[id], 0);
        return {
            basic: basicTotal, unique: selected.length, total: basicTotal + selected.length, byType,
            buildableKinds: basicIds.filter(id => counts[id] > 0).length + selected.filter(id => id !== "secret_vault").length
        };
    }

    function getCitySize(players, rules) {
        const custom = normalizeRules(rules).citySize;
        return custom === null ? (players === 3 ? 8 : 7) : custom;
    }

    function getStartErrors(value, players) {
        const errors = [];
        let setup;
        try {
            setup = normalizeSetup(value);
        } catch (error) {
            return [error.message];
        }
        if (!Number.isInteger(players) || players < 2 || players > 8)
            return ["Для начала игры нужно от 2 до 8 игроков."];
        errors.push(...getCharacterPlayerErrors(setup.characters, players));
        try {
            normalizeUniqueDistricts(setup.districts.unique, players);
        } catch (error) { errors.push(error.message); }
        const summary = getDeckSummary(setup.districts.basic, setup.districts.unique);
        const citySize = getCitySize(players, setup.rules), minimum = citySize * players;
        const required = getStartingRequirements(setup.starting, players);
        if (required.cards > summary.total)
            errors.push("Недостаточно карт для стартовой раздачи: нужно " + required.cards + ", в наборе: " + summary.total + ".");
        if (required.unique > summary.unique)
            errors.push("Недостаточно особых кварталов: нужно минимум " + required.unique + ", выбрано " + summary.unique + ".");
        if (setup.starting.exactUnique && required.basic > summary.basic)
            errors.push("Недостаточно базовых кварталов для фиксированного числа особых: нужно " + required.basic + ", в наборе: " + summary.basic + ".");
        if (summary.total < minimum)
            errors.push("Недостаточно карт: " + summary.total + ". Для " + players + " игроков нужно минимум " + minimum + " (" + citySize + " × " + players + ").");
        if (summary.buildableKinds < citySize)
            errors.push("Нужно минимум " + citySize + " разных строящихся кварталов; сейчас " + summary.buildableKinds + ".");
        return errors;
    }

    return {
        FORMAT, VERSION, MAX_COPIES, MAX_FILE_SIZE,
        districts, basicIds, uniqueIds, groups, timerPresets, timerLimits,
        getDefaultBasicCounts, normalizeBasicCounts, normalizeUniqueDistricts,
        normalizeCharacters, getCharacterPlayerErrors, characterRequirements,
        normalizeTimerSettings, normalizeStarting, normalizeRules, normalizeSetup,
        getStartingResources, getStartingRequirements,
        parseSetup, serializeSetup, getDefaultSetup, getDeckSummary, getCitySize, getStartErrors
    };
}));
