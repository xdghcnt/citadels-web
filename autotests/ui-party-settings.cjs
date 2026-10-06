module.exports = async function (page) {
    const baseUrl = "__BASE_URL__";
    const browser = page.context().browser();
    const contexts = [];
    const results = [];
    const pageErrors = [];
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    async function actor(name, url, legacyHtml = false) {
        const context = await browser.newContext({viewport: {width: 1600, height: 1000}});
        contexts.push(context);
        await context.addInitScript(name => {
            localStorage.userName = name;
            localStorage.updatesVersion = "999999";
        }, name);
        const client = await context.newPage();
        client.on("pageerror", error => pageErrors.push(name + ": " + error.message));
        if (legacyHtml) {
            // The cached HTML never executed a separate storage script. Keep that dependency
            // unavailable, without intercepting the document (which changes Chrome's IP space).
            await client.route("**/citadels/setup-storage.js*", route =>
                route.fulfill({status: 200, contentType: "application/javascript", body: ""}));
        }
        client.sentFrames = [];
        client.on("websocket", socket => socket.on("framesent", ({payload}) => client.sentFrames.push(String(payload))));
        client.setDefaultTimeout(10000);
        client.setDefaultNavigationTimeout(30000);
        await client.goto(url, {waitUntil: "domcontentloaded"});
        await client.locator(".settings-hover-button").waitFor().catch(error => {
            throw new Error(name + ": " + error.message + "; page errors: " + pageErrors.join("; "));
        });
        const ready = client.getByText("Готово", {exact: true});
        if (await ready.isVisible()) await ready.click();
        return client;
    }
    async function editor(host) {
        await host.locator(".settings-hover-button").hover();
        await host.locator(".start-game").filter({hasText: "play_arrow"}).click();
        await host.getByRole("dialog", {name: "Настройки игры"}).waitFor();
        await host.getByRole("button", {name: /Расширенные настройки/}).click();
    }
    async function viewer(client) {
        await client.locator(".settings-hover-button").hover();
        await client.getByTitle("Посмотреть сетап партии").click();
        await client.getByRole("dialog", {name: "Сетап партии"}).waitFor();
        const advanced = client.getByRole("button", {name: /Расширенные настройки/});
        if (await advanced.isVisible()) await advanced.click();
        assert(await client.getByRole("dialog").locator("input, select, textarea").count() === 0, "В просмотре появились поля редактирования");
        assert(await client.getByRole("button", {name: /Импорт|Экспорт/}).count() === 0, "Импорт или экспорт доступен зрителю");
    }
    async function entry(client, label, expected) {
        const row = client.locator(".setup-view-entry").filter({has: client.locator("dt", {hasText: label})});
        await row.locator("dd").filter({hasText: new RegExp("^" + expected + "$")}).waitFor();
    }
    async function checkPiles(client, deck, discard) {
        await client.locator('[data-pile="deck"]').filter({hasText: String(deck)}).waitFor();
        assert(await client.locator('[data-pile="deck"]').innerText() === String(deck), "Неверное число карт в колоде");
        assert(await client.locator('[data-pile="discard"]').innerText() === String(discard), "Неверное число карт в сбросе");
        await client.locator(".district-pile-counts button").focus();
        await client.locator("#district-pile-help").waitFor();
        const tip = await client.locator("#district-pile-help").evaluate(element => {
            const rect = element.getBoundingClientRect();
            return {inside: rect.left >= 0 && rect.top >= 0 && rect.right <= document.documentElement.clientWidth && rect.bottom <= window.innerHeight,
                portal: element.parentNode === document.body, text: element.textContent};
        });
        assert(tip.inside && tip.portal, "Подсказка обрезана или находится вне экрана");
        assert(tip.text.includes("сброс перемешивается"), "Подсказка не объясняет перетасовку сброса");
        await client.locator(".district-pile-counts button").press("Escape");
        await client.locator("#district-pile-help").waitFor({state: "hidden"});
    }

    try {
        // CASE 1: validation, file round trip and actual crown resources after dealing.
        const room1 = baseUrl + "/bg/citadels#ui-crown-" + Date.now();
        const host = await actor("CrownHost", room1);
        await host.getByText("Занять", {exact: true}).first().click();
        const player = await actor("CrownPlayer", room1);
        await player.getByText("Занять", {exact: true}).first().click();
        await editor(host);
        await host.getByLabel("Включить", {exact: true}).uncheck();
        for (const id of ["starting-handSize", "starting-minUnique", "starting-gold",
            "crown-reduction-cards", "crown-reduction-gold", "city-size",
            "bonus-firstCity", "bonus-otherCities", "bonus-allColors"]) {
            const input = host.locator("#" + id), counter = input.locator("..");
            const initial = Number(await input.inputValue());
            await counter.getByRole("button").last().click();
            assert(Number(await input.inputValue()) === initial + 1, "Кнопка + не увеличила " + id);
            await counter.getByRole("button").first().click();
            assert(Number(await input.inputValue()) === initial, "Кнопка − не уменьшила " + id);
        }
        const cityInput = host.locator("#city-size"), cityCounter = cityInput.locator("..");
        await cityInput.fill("2");
        assert(await cityCounter.getByRole("button").first().isDisabled(), "Размер города можно уменьшить ниже 2");
        await cityInput.fill("10");
        assert(await cityCounter.getByRole("button").last().isDisabled(), "Размер города можно увеличить выше 10");
        await cityInput.fill("");
        await cityCounter.getByRole("button").last().click();
        assert(await cityInput.inputValue() === "2", "Кнопка + не восстановила пустое поле города");
        await host.locator("#deck-count-manor").fill("6");
        await host.getByLabel("Не сбрасывать одного персонажа случайно два раунда подряд", {exact: true}).check();
        for (const [id, value] of Object.entries({"starting-handSize": "6", "starting-minUnique": "2", "starting-gold": "5",
            "crown-reduction-cards": "1", "crown-reduction-gold": "2", "bonus-firstCity": "6", "bonus-otherCities": "1", "bonus-allColors": "0"}))
            await host.locator("#" + id).fill(value);
        await host.getByLabel("Фиксированное число", {exact: true}).check();
        await host.locator(".starting-settings-reset").click();
        for (const [id, value] of Object.entries({"starting-handSize": "4", "starting-minUnique": "0", "starting-gold": "2",
            "crown-reduction-cards": "0", "crown-reduction-gold": "0", "city-size": "7",
            "bonus-firstCity": "4", "bonus-otherCities": "2", "bonus-allColors": "3"}))
            assert(await host.locator("#" + id).inputValue() === value, "Общий сброс не восстановил " + id);
        assert(!await host.getByLabel("Фиксированное число", {exact: true}).isChecked(), "Общий сброс сохранил фиксированное число особых");
        assert(await host.locator("#deck-count-manor").inputValue() === "6", "Общий сброс изменил базовую колоду");
        assert(await host.getByLabel("Не сбрасывать одного персонажа случайно два раунда подряд", {exact: true}).isChecked(), "Общий сброс изменил правило сброса персонажей");
        assert(!await host.getByLabel("Включить", {exact: true}).isChecked(), "Общий сброс изменил таймер");
        await host.getByRole("button", {name: /Расширенные настройки/}).click();
        assert(!await host.locator(".starting-settings-reset").isVisible(), "Общий сброс виден при закрытом спойлере");
        await host.getByRole("button", {name: /Расширенные настройки/}).click();
        await host.locator(".basic-deck-reset").click();
        await host.locator("#starting-minUnique").fill("1");
        await host.getByLabel("Фиксированное число", {exact: true}).check();
        await host.locator("#crown-reduction-cards").fill("4");
        assert(await host.getByRole("button", {name: "Создать", exact: true}).isDisabled(), "Запуск с минимумом 1 и рукой короны 0 разрешён");
        assert((await host.getByRole("alert").innerText()).includes("первого владельца короны"), "Нет причины запрета уменьшенной руки");
        await host.locator("#crown-reduction-cards").fill("3");
        await host.locator("#crown-reduction-gold").fill("2");
        await host.locator("#bonus-firstCity").fill("6");
        await host.locator("#bonus-otherCities").fill("1");
        await host.locator("#bonus-allColors").fill("0");
        await host.getByLabel("Не сбрасывать одного персонажа случайно два раунда подряд", {exact: true}).check();
        const downloadReady = host.waitForEvent("download");
        await host.getByRole("button", {name: "Экспорт JSON", exact: true}).click();
        const download = await downloadReady;
        const filePath = await download.path();
        await host.locator("#crown-reduction-cards").fill("0");
        await host.locator("#bonus-firstCity").fill("4");
        await host.getByRole("dialog").locator('input[type="file"]').setInputFiles(filePath);
        await host.waitForFunction(() => document.querySelector("#crown-reduction-cards").value === "3");
        assert(await host.locator("#bonus-firstCity").inputValue() === "6", "Экспорт/импорт потерял бонус");
        assert(await host.getByLabel("Не сбрасывать одного персонажа случайно два раунда подряд", {exact: true}).isChecked(), "Экспорт/импорт потерял правило сброса");
        await host.getByRole("button", {name: "Создать", exact: true}).click();
        await host.getByRole("dialog").waitFor({state: "hidden"});
        const resources = await host.locator(".player-slot .resources").evaluateAll(elements => elements.map(element => ({
            crown: element.closest(".player-slot").classList.contains("hasCrown"),
            hand: Number(element.querySelector(".hand .resource-count").textContent),
            gold: Number(element.querySelector(".gold .resource-count").textContent)
        })));
        assert(resources.length === 2 && resources.filter(value => value.crown).length === 1, "Корона не назначена одному из двух игроков");
        resources.forEach(value => assert(value.hand === (value.crown ? 1 : 4) && value.gold === (value.crown ? 0 : 2), "Неверные стартовые ресурсы короны"));
        for (const client of [host, player]) {
            const specials = await client.locator(".hand-section .card-item").evaluateAll(elements => elements.filter(element => {
                const match = element.style.backgroundImage.match(/\/cards\/([^/.]+)\.jpg/);
                return match && CitadelsSetup.districts[match[1]].type === 9;
            }).length);
            assert(specials === 1, "В стартовой руке не ровно один особый квартал");
            await checkPiles(client, 60, 0);
        }
        results.push("CASE 1 PASS — crown validation, JSON round trip, resources and conserved deck");

        // CASE 2: the cached legacy HTML needs no extra script; drafts survive F5.
        const room2 = baseUrl + "/bg/citadels#ui-view-" + Date.now();
        const host2 = await actor("ViewHost", room2, true);
        assert(await host2.locator('script[src*="/citadels/setup-storage.js"]').count() === 0, "Тест не воспроизвёл старый HTML");
        await host2.getByText("Занять", {exact: true}).first().click();
        const player2 = await actor("ViewPlayer", room2);
        await player2.getByText("Занять", {exact: true}).first().click();
        const spectator = await actor("ViewSpectator", room2);
        await editor(host2);
        await host2.getByLabel("Включить", {exact: true}).uncheck();
        for (const client of [player2, spectator]) await viewer(client);
        const sentBeforeEditing = host2.sentFrames.length;
        await host2.locator("#bonus-allColors").fill("9");
        await host2.locator("#starting-minUnique").fill("1");
        await host2.locator("#crown-reduction-cards").fill("4");
        for (const client of [player2, spectator]) {
            await client.getByText("Настройки будут доступны после начала партии.", {exact: true}).waitFor();
            assert(await client.locator(".setup-view-entry").count() === 0, "Незавершённый сетап попал к участнику");
        }
        await host2.locator("#crown-reduction-cards").fill("1");
        assert(host2.sentFrames.length === sentBeforeEditing, "Редактирование формы отправило WebSocket-сообщения");
        await host2.reload();
        await host2.locator(".settings-hover-button").waitFor();
        await editor(host2);
        assert(await host2.locator("#bonus-allColors").inputValue() === "9", "F5 потерял локальный бонус");
        assert(await host2.locator("#crown-reduction-cards").inputValue() === "1", "F5 потерял локальные ресурсы");
        await player2.getByRole("button", {name: "Закрыть", exact: true}).click();
        await player2.reload();
        await player2.locator(".settings-hover-button").waitFor();
        await viewer(player2);
        for (const client of [player2, spectator]) {
            await client.getByText("Настройки будут доступны после начала партии.", {exact: true}).waitFor();
        }
        await spectator.setViewportSize({width: 390, height: 844});
        const inside = await spectator.getByRole("dialog").evaluate(element => {
            const rect = element.getBoundingClientRect();
            return rect.left >= 0 && rect.top >= 0 && rect.right <= document.documentElement.clientWidth && rect.bottom <= window.innerHeight;
        });
        assert(inside, "Окно просмотра выходит за мобильный экран");
        await host2.getByRole("button", {name: "Создать", exact: true}).click();
        for (const client of [player2, spectator]) {
            await client.getByRole("button", {name: /Расширенные настройки/}).click();
            await entry(client, "За все пять цветов", "9");
            await entry(client, "Первая корона: карты / золото", "3 / 2");
            const dialog = client.getByRole("dialog", {name: "Сетап партии"});
            assert(await dialog.getByText("Персонажи", {exact: true}).count() === 0, "Нехосту показан блок персонажей");
            assert(await dialog.locator(".character.card-item").count() === 0, "Нехосту показаны карты персонажей");
            for (const label of ["Уменьшение карт первой короны", "Уменьшение золота первой короны"])
                assert(await dialog.getByText(label, {exact: true}).count() === 0, "Нехосту показано поле: " + label);
            await client.getByRole("button", {name: "Закрыть", exact: true}).click();
            await checkPiles(client, 58, 0);
        }
        await player2.reload();
        await player2.locator(".settings-hover-button").waitFor();
        await viewer(player2);
        await entry(player2, "За все пять цветов", "9");
        const lateSpectator = await actor("LateSpectator", room2);
        await viewer(lateSpectator);
        await entry(lateSpectator, "За все пять цветов", "9");
        assert(pageErrors.length === 0, "Ошибки страницы: " + pageErrors.join("; "));
        results.push("CASE 2 PASS — legacy HTML, local draft and F5, no edit traffic, setup on start/reconnect/join");
        return results;
    } finally {
        for (const context of contexts) await context.close();
    }
};
